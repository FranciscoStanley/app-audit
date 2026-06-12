import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_USER = 'https://api.github.com/user';
const GITHUB_EMAILS = 'https://api.github.com/user/emails';

const SCOPES = ['read:user', 'user:email', 'repo', 'security_events'].join(' ');

export interface GitHubProfile {
  id: string;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class GitHubOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get('GITHUB_OAUTH_CLIENT_ID') &&
      this.config.get('GITHUB_OAUTH_CLIENT_SECRET'),
    );
  }

  buildAuthorizeUrl(consentId: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException('GitHub OAuth não configurado no servidor');
    }
    if (!consentId?.trim()) {
      throw new BadRequestException(
        'Consentimento LGPD obrigatório antes do OAuth GitHub',
      );
    }

    const state = this.jwt.sign(
      {
        purpose: 'github_oauth',
        consentId: consentId.trim(),
        nonce: randomBytes(16).toString('hex'),
      },
      { expiresIn: '10m' },
    );

    const params = new URLSearchParams({
      client_id: this.config.get<string>('GITHUB_OAUTH_CLIENT_ID')!,
      redirect_uri: this.callbackUrl(),
      scope: SCOPES,
      state,
    });

    return `${GITHUB_AUTHORIZE}?${params.toString()}`;
  }

  validateState(state: string): string {
    try {
      const payload = this.jwt.verify<{ purpose: string; consentId?: string }>(
        state,
      );
      if (payload.purpose !== 'github_oauth' || !payload.consentId)
        throw new Error('invalid');
      return payload.consentId;
    } catch {
      throw new UnauthorizedException('State OAuth inválido ou expirado');
    }
  }

  async exchangeCode(
    code: string,
  ): Promise<{ accessToken: string; profile: GitHubProfile }> {
    const tokenRes = await fetch(GITHUB_TOKEN, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.get('GITHUB_OAUTH_CLIENT_ID'),
        client_secret: this.config.get('GITHUB_OAUTH_CLIENT_SECRET'),
        code,
        redirect_uri: this.callbackUrl(),
      }),
    });

    if (!tokenRes.ok) {
      throw new UnauthorizedException('Falha ao trocar código OAuth do GitHub');
    }

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      throw new UnauthorizedException(
        tokenData.error_description ??
          tokenData.error ??
          'Token GitHub ausente',
      );
    }

    const profile = await this.fetchProfile(tokenData.access_token);
    return { accessToken: tokenData.access_token, profile };
  }

  private async fetchProfile(accessToken: string): Promise<GitHubProfile> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'app-audit',
    };

    const userRes = await fetch(GITHUB_USER, { headers });
    if (!userRes.ok)
      throw new UnauthorizedException('Falha ao obter perfil GitHub');

    const user = (await userRes.json()) as {
      id: number;
      login: string;
      name: string | null;
      email: string | null;
      avatar_url: string | null;
    };

    let email = user.email;
    if (!email) {
      const emailsRes = await fetch(GITHUB_EMAILS, { headers });
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        email =
          emails.find((e) => e.primary && e.verified)?.email ??
          emails.find((e) => e.verified)?.email ??
          emails[0]?.email ??
          null;
      }
    }

    return {
      id: String(user.id),
      login: user.login,
      name: user.name,
      email: email ?? `${user.login}@users.noreply.github.com`,
      avatarUrl: user.avatar_url,
    };
  }

  callbackUrl(): string {
    return (
      this.config.get<string>('GITHUB_OAUTH_CALLBACK_URL') ??
      'http://localhost:3000/v1/auth/github/callback'
    );
  }

  frontendCallbackUrl(): string {
    return (
      this.config.get<string>('FRONTEND_URL') ??
      this.config.get<string>('CORS_ORIGIN') ??
      'http://localhost:3001'
    );
  }
}
