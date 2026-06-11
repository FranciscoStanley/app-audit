import { BadRequestException, Injectable } from '@nestjs/common';
import { GitHubConnectionStore } from '../../infrastructure/auth/github-connection.store';
import { GitHubOAuthService } from '../../infrastructure/auth/github-oauth.service';
import { OAuthCodeStore } from '../../infrastructure/auth/oauth-code.store';
import { UsersService } from '../../infrastructure/auth/users.service';
import { AuthService } from './auth.service';
import { GitHubConsentUseCase } from './github-consent.use-case';

@Injectable()
export class GitHubAuthUseCase {
  constructor(
    private readonly oauth: GitHubOAuthService,
    private readonly users: UsersService,
    private readonly connections: GitHubConnectionStore,
    private readonly oauthCodes: OAuthCodeStore,
    private readonly auth: AuthService,
    private readonly consent: GitHubConsentUseCase,
  ) {}

  isEnabled(): boolean {
    return this.oauth.isConfigured();
  }

  async handleCallback(code: string, state: string) {
    if (!code) throw new BadRequestException('Código OAuth ausente');
    const consentId = this.oauth.validateState(state);
    await this.consent.assertConsentForCallback(consentId);

    const { accessToken, profile } = await this.oauth.exchangeCode(code);
    const user = await this.users.upsertFromGitHub({
      githubId: profile.id,
      githubUsername: profile.login,
      email: profile.email!,
      name: profile.name ?? profile.login,
    });

    await this.connections.saveConnection(user.id, {
      githubId: profile.id,
      githubUsername: profile.login,
      accessToken,
    });

    await this.consent.completeConsent(consentId, user.id, profile.id);

    return this.auth.buildAuthResponse(user, {
      githubConnected: true,
      githubUsername: profile.login,
    });
  }

  async disconnectGitHub(userId: string): Promise<void> {
    await this.connections.removeConnection(userId);
    await this.consent.revokeConsentForUser(userId);
  }

  async getGitHubStatus(userId: string) {
    const connection = await this.connections.getConnection(userId);
    return {
      connected: Boolean(connection),
      githubUsername: connection?.githubUsername ?? null,
      connectedAt: connection?.connectedAt ?? null,
    };
  }

  getFrontendRedirectUrl(accessToken: string): string {
    const code = this.oauthCodes.issue(accessToken);
    const base = this.oauth.frontendCallbackUrl().replace(/\/$/, '');
    return `${base}/login/github/callback?code=${encodeURIComponent(code)}`;
  }

  exchangeCode(code: string) {
    if (!code?.trim()) throw new BadRequestException('Código OAuth ausente');
    const accessToken = this.oauthCodes.exchange(code.trim());
    return this.auth.validateAccessToken(accessToken);
  }
}
