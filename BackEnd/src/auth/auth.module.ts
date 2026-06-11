import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserStore } from '../infrastructure/auth/user.store';
import { UsersService } from '../infrastructure/auth/users.service';
import { AuthController } from '../presentation/auth/auth.controller';
import { AuthService } from '../application/use-cases/auth.service';
import { JwtStrategy } from '../infrastructure/auth/jwt.strategy';
import { RolesGuard } from '../infrastructure/auth/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') ?? 'app-audit-dev-secret-change-in-production',
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') ?? '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, UserStore, JwtStrategy, RolesGuard],
  exports: [AuthService, JwtModule, RolesGuard, UsersService],
})
export class AuthModule {}
