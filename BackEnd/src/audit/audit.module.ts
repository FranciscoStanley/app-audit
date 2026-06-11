import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RunMiasmaAuditUseCase } from '../application/use-cases/run-miasma-audit.use-case';
import { RemediationUseCase } from '../application/use-cases/remediation.use-case';
import { GITHUB_REPOSITORY_PORT } from '../domain/ports/github-repository.port';
import { GhCliGitHubAdapter } from '../infrastructure/github/gh-cli-github.adapter';
import { MarkdownReportGenerator } from '../infrastructure/report/markdown-report.generator';
import { PdfReportGenerator } from '../infrastructure/report/pdf-report.generator';
import { VulnerabilityReportGenerator } from '../infrastructure/report/vulnerability-report.generator';
import { AdditionalSecurityScanner } from '../infrastructure/scanners/additional-security.scanner';
import { ComprehensiveSecurityScanner } from '../infrastructure/scanners/comprehensive-security.scanner';
import { MiasmaRepositoryScanner } from '../infrastructure/scanners/miasma-repository.scanner';
import { AuditReportStore } from '../infrastructure/storage/audit-report.store';
import { AuditController } from '../presentation/audit/audit.controller';
import { ThreatIntelModule } from '../threat-intel/threat-intel.module';

@Module({
  imports: [ThreatIntelModule, AuthModule],
  controllers: [AuditController],
  providers: [
    RunMiasmaAuditUseCase,
    RemediationUseCase,
    MiasmaRepositoryScanner,
    AdditionalSecurityScanner,
    ComprehensiveSecurityScanner,
    MarkdownReportGenerator,
    PdfReportGenerator,
    VulnerabilityReportGenerator,
    AuditReportStore,
    { provide: GITHUB_REPOSITORY_PORT, useClass: GhCliGitHubAdapter },
  ],
  exports: [RunMiasmaAuditUseCase, AuditReportStore],
})
export class AuditModule {}
