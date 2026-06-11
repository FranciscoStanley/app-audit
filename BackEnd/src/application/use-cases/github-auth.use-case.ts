import { BadRequestException, Injectable } from '@nestjs/common';
import { GitHubConnectionStore } from '../../infrastructure/auth/github-connection.store';
import { GitHubOAuthService } from '../../infrastructure/auth/github-oauth.service';
import { UsersService } from '../../infrastructure/auth/users.service';
import { AuthService } from './auth.service';

@Injectable()
export class GitHubAuthUseCase {
  constructor(
    private readonly oauth: GitHubOAuthService,
    private readonly users: UsersService,
    private readonly connections: GitHubConnectionStore,
    private readonly auth: AuthService,
  ) {}

  getAuthorizeUrl(): string {
    return this.oauth.buildAuthorizeUrl();
  }

  isEnabled(): boolean {
    return this.oauth.isConfigured();
  }

  async handleCallback(code: string, state: string) {
    if (!code) throw new BadRequestException('Código OAuth ausente');
    this.oauth.validateState(state);

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

    return this.auth.buildAuthResponse(user, {
      githubConnected: true,
      githubUsername: profile.login,
    });
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
    const base = this.oauth.frontendCallbackUrl().replace(/\/$/, '');
    return `${base}/login/github/callback?token=${encodeURIComponent(accessToken)}`;
  }
}
