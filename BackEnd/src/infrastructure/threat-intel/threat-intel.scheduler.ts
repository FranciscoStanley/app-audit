import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SyncThreatIntelligenceUseCase } from '../../application/use-cases/sync-threat-intelligence.use-case';

@Injectable()
export class ThreatIntelScheduler implements OnModuleInit {
  private readonly logger = new Logger(ThreatIntelScheduler.name);

  constructor(
    private readonly syncThreatIntel: SyncThreatIntelligenceUseCase,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    if (this.config.get('THREAT_INTEL_SYNC_ON_STARTUP', 'true') === 'true') {
      this.logger.log('Sincronização inicial de threat intelligence...');
      await this.syncThreatIntel
        .execute()
        .catch((err) =>
          this.logger.warn(`Sync inicial falhou: ${err.message}`),
        );
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async handleScheduledSync(): Promise<void> {
    this.logger.log(
      'Sincronização agendada — GitHub Advisories + OpenSourceMalware',
    );
    await this.syncThreatIntel.execute();
  }
}
