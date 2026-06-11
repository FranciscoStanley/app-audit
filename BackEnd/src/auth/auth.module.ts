import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { resolveJwtSecret } from '../config/jwt-secret';
import { UserStore } from '../infrastructure/auth/user.store';
import { UsersService } from '../infrastructure/auth/users.service';
import { AuthController } from '../presentation/auth/auth.controller';
import { AuthService } from '../application/use-cases/auth.service';
import { GitHubAuthUseCase } from '../application/use-cases/github-auth.use-case';
import { GitHubConsentUseCase } from '../application/use-cases/github-consent.use-case';
import { LoginConsentUseCase } from '../application/use-cases/login-consent.use-case';
import { RemediationConsentUseCase } from '../application/use-cases/remediation-consent.use-case';
import { ConsentStore } from '../infrastructure/auth/consent.store';
import { GitHubTokenResolverService } from '../application/use-cases/github-token-resolver.service';
import { GitHubConnectionStore } from '../infrastructure/auth/github-connection.store';
import { GitHubOAuthService } from '../infrastructure/auth/github-oauth.service';
import { OAuthCodeStore } from '../infrastructure/auth/oauth-code.store';
import { JwtStrategy } from '../infrastructure/auth/jwt.strategy';
import { RolesGuard } from '../infrastructure/auth/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(config),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') ?? '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GitHubAuthUseCase,
    GitHubConsentUseCase,
    LoginConsentUseCase,
    RemediationConsentUseCase,
    GitHubTokenResolverService,
    GitHubOAuthService,
    OAuthCodeStore,
    ConsentStore,
    GitHubConnectionStore,
    UsersService,
    UserStore,
    JwtStrategy,
    RolesGuard,
  ],
  exports: [
    AuthService,
    GitHubTokenResolverService,
    GitHubConnectionStore,
    JwtModule,
    RolesGuard,
    UsersService,
    RemediationConsentUseCase,
  ],
})
export class AuthModule {}
