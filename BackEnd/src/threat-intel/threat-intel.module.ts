import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CheckAssetThreatUseCase } from '../application/use-cases/check-asset-threat.use-case';
import { SyncThreatIntelligenceUseCase } from '../application/use-cases/sync-threat-intelligence.use-case';
import {
  GITHUB_ADVISORY_PORT,
  OPEN_SOURCE_MALWARE_PORT,
} from '../domain/ports/threat-intelligence.port';
import { GitHubAdvisoryAdapter } from '../infrastructure/threat-intel/github-advisory.adapter';
import { OpenSourceMalwareAdapter } from '../infrastructure/threat-intel/open-source-malware.adapter';
import { ThreatIntelScheduler } from '../infrastructure/threat-intel/threat-intel.scheduler';
import { ThreatIntelligenceStore } from '../infrastructure/threat-intel/threat-intelligence.store';
import { ThreatIntelController } from '../presentation/threat-intel/threat-intel.controller';

@Module({
  imports: [AuthModule],
  controllers: [ThreatIntelController],
  providers: [
    ThreatIntelligenceStore,
    ThreatIntelScheduler,
    SyncThreatIntelligenceUseCase,
    CheckAssetThreatUseCase,
    { provide: GITHUB_ADVISORY_PORT, useClass: GitHubAdvisoryAdapter },
    { provide: OPEN_SOURCE_MALWARE_PORT, useClass: OpenSourceMalwareAdapter },
  ],
  exports: [
    ThreatIntelligenceStore,
    SyncThreatIntelligenceUseCase,
    OPEN_SOURCE_MALWARE_PORT,
  ],
})
export class ThreatIntelModule {}
