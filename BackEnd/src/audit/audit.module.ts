import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RunMiasmaAuditUseCase } from '../application/use-cases/run-miasma-audit.use-case';
import { BackgroundJobUseCase } from '../application/use-cases/background-job.use-case';
import { RemediationUseCase } from '../application/use-cases/remediation.use-case';
import { BackgroundJobProcessor } from '../infrastructure/jobs/background-job.processor';
import { GitHubAdapterFactory } from '../infrastructure/github/github-adapter.factory';
import { GitHubRemediationFactory } from '../infrastructure/github/github-remediation.factory';
import { AuditScannerFactory } from '../infrastructure/scanners/audit-scanner.factory';
import { MarkdownReportGenerator } from '../infrastructure/report/markdown-report.generator';
import { PdfReportGenerator } from '../infrastructure/report/pdf-report.generator';
import { VulnerabilityReportGenerator } from '../infrastructure/report/vulnerability-report.generator';
import { AuditReportStore } from '../infrastructure/storage/audit-report.store';
import { BackgroundJobStore } from '../infrastructure/storage/background-job.store';
import { AuditController } from '../presentation/audit/audit.controller';
import { ThreatIntelModule } from '../threat-intel/threat-intel.module';

@Module({
  imports: [ThreatIntelModule, AuthModule],
  controllers: [AuditController],
  providers: [
    RunMiasmaAuditUseCase,
    BackgroundJobUseCase,
    BackgroundJobProcessor,
    BackgroundJobStore,
    RemediationUseCase,
    GitHubAdapterFactory,
    GitHubRemediationFactory,
    AuditScannerFactory,
    MarkdownReportGenerator,
    PdfReportGenerator,
    VulnerabilityReportGenerator,
    AuditReportStore,
  ],
  exports: [RunMiasmaAuditUseCase, AuditReportStore],
})
export class AuditModule {}
