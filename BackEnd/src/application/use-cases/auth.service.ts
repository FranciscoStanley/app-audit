import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '../../domain/entities/user.entity';
import { ConsentAcknowledgments } from '../../infrastructure/auth/consent.store';
import { UsersService } from '../../infrastructure/auth/users.service';
import { LoginConsentUseCase } from './login-consent.use-case';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
  githubConnected?: boolean;
  githubUsername?: string;
}

export interface AuthUserView {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  githubConnected?: boolean;
  githubUsername?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly loginConsent: LoginConsentUseCase,
  ) {}

  async login(
    email: string,
    password: string,
    consent: ConsentAcknowledgments,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.users.findByEmail(email);
    if (!user || !(await this.users.validatePassword(user, password))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.loginConsent.recordLoginConsent(user.id, consent, meta ?? {});

    return this.buildAuthResponse(user);
  }

  buildAuthResponse(
    user: User,
    github?: { githubConnected: boolean; githubUsername?: string },
  ) {
    const githubConnected =
      github?.githubConnected ?? Boolean(user.githubId && user.githubUsername);
    const githubUsername = github?.githubUsername ?? user.githubUsername;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      githubConnected,
      githubUsername,
    };

    const view: AuthUserView = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      githubConnected,
      githubUsername,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: view,
    };
  }

  async validatePayload(payload: JwtPayload): Promise<AuthUserView> {
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      githubConnected: Boolean(user.githubId),
      githubUsername: user.githubUsername,
    };
  }

  async validateAccessToken(accessToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(accessToken);
      const user = await this.validatePayload(payload);
      return { accessToken, user };
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
