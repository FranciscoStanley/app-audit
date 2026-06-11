import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './presentation/health/health.controller';
import { ThreatIntelModule } from './threat-intel/threat-intel.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AuthModule,
    ThreatIntelModule,
    AuditModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
