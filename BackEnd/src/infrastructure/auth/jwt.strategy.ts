import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthService,
  JwtPayload,
} from '../../application/use-cases/auth.service';
import { resolveJwtSecret } from '../../config/jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(config),
    });
  }

  validate(payload: JwtPayload) {
    try {
      return this.authService.validatePayload(payload);
    } catch {
      throw new UnauthorizedException();
    }
  }
}
