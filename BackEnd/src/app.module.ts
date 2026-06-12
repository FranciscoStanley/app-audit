import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { HealthService } from './application/services/health.service';
import { HttpLoggingInterceptor } from './infrastructure/logging/http-logging.interceptor';
import { HealthController } from './presentation/health/health.controller';
import { ThreatIntelModule } from './threat-intel/threat-intel.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 300),
      },
    ]),
    AuthModule,
    ThreatIntelModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
  ],
})
export class AppModule {}
