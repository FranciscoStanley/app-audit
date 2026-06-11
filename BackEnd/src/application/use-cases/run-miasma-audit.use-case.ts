import { Inject, Injectable, Logger } from '@nestjs/common';
import { MIASMA_ATTACK_START_DATE, MIASMA_SOURCE_URL } from '../../domain/constants/miasma-threat.constants';
import { AuditReport, ImmediateAction, TechnologySummary } from '../../domain/entities/audit-report.entity';
import { RepositoryScan } from '../../domain/entities/repository-scan.entity';
import { GITHUB_REPOSITORY_PORT } from '../../domain/ports/github-repository.port';
import type { GitHubRepositoryPort } from '../../domain/ports/github-repository.port';
import { ComprehensiveSecurityScanner } from '../../infrastructure/scanners/comprehensive-security.scanner';
import { MarkdownReportGenerator } from '../../infrastructure/report/markdown-report.generator';
import { VulnerabilityReportGenerator } from '../../infrastructure/report/vulnerability-report.generator';
import { ThreatIntelligenceStore } from '../../infrastructure/threat-intel/threat-intelligence.store';
import { AuditReportStore } from '../../infrastructure/storage/audit-report.store';
import { SyncThreatIntelligenceUseCase } from './sync-threat-intelligence.use-case';

export interface RunMiasmaAuditInput {
  saveReportPath?: string;
}

export interface RunMiasmaAuditOutput {
  report: AuditReport;
  markdown: string;
  savedTo?: string;
  auditId?: string;
}

@Injectable()
export class RunMiasmaAuditUseCase {
  private readonly logger = new Logger(RunMiasmaAuditUseCase.name);

  constructor(
    @Inject(GITHUB_REPOSITORY_PORT) private readonly github: GitHubRepositoryPort,
    private readonly scanner: ComprehensiveSecurityScanner,
    private readonly reportGenerator: MarkdownReportGenerator,
    private readonly vulnerabilityReportGenerator: VulnerabilityReportGenerator,
    private readonly syncThreatIntel: SyncThreatIntelligenceUseCase,
    private readonly threatStore: ThreatIntelligenceStore,
    private readonly auditStore: AuditReportStore,
  ) {}

  async execute(input: RunMiasmaAuditInput = {}): Promise<RunMiasmaAuditOutput> {
    await this.syncThreatIntel.execute().catch((err) =>
      this.logger.warn(`Sync threat intel ignorado: ${err.message}`),
    );

    const username = await this.github.getAuthenticatedUser();
    const repositories = await this.github.listRepositories();

    this.logger.log(`Auditando ${repositories.length} repositórios de @${username}...`);

    const scans: RepositoryScan[] = [];
    for (const repo of repositories) {
      try {
        const scan = await this.scanner.scan(repo);
        scans.push(scan);
        if (scan.isAffected) {
          this.logger.warn(`AFETADO: ${repo.fullName} (${scan.findings.length} achados)`);
        }
      } catch (error) {
        this.logger.error(`Erro ao auditar ${repo.fullName}: ${(error as Error).message}`);
      }
    }

    const affected = scans.filter((s) => s.isAffected);
    const totalVulnerabilities = scans.reduce((sum, s) => sum + s.vulnerabilityCount, 0);
    const technologies = this.buildTechnologySummary(scans);
    const intelStatus = this.threatStore.getStatus();
    const report: AuditReport = {
      auditedAt: new Date().toISOString(),
      githubUsername: username,
      totalRepositories: repositories.length,
      publicRepositories: repositories.filter((r) => !r.isPrivate).length,
      privateRepositories: repositories.filter((r) => r.isPrivate).length,
      allRepositories: scans,
      affectedRepositories: affected,
      cleanRepositories: scans.length - affected.length,
      totalVulnerabilities,
      technologies,
      immediateActions: this.buildImmediateActions(affected.length > 0),
      sourceReference: MIASMA_SOURCE_URL,
      verdict: affected.length > 0 ? 'affected' : 'not_affected',
      limitations: this.buildLimitations(intelStatus),
      threatIntel: {
        lastSyncedAt: intelStatus.lastSyncedAt,
        totalPackages: intelStatus.totalPackages,
        totalRepositories: intelStatus.totalRepositories,
        githubAdvisoryEnabled: intelStatus.githubAdvisoryEnabled,
        openSourceMalwareEnabled: intelStatus.openSourceMalwareEnabled,
      },
    };

    const markdown = this.reportGenerator.generate(report);
    const stored = await this.auditStore.save(report, markdown);
    const findingReports = await this.auditStore.saveAllFindingReports(
      stored.id,
      report,
      (ctx) => this.vulnerabilityReportGenerator.generate(ctx),
    );
    if (findingReports > 0) {
      this.logger.log(`${findingReports} relatório(s) individual(is) de vulnerabilidade gerado(s)`);
    }

    let savedTo: string | undefined;
    if (input.saveReportPath) {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const dir = path.dirname(input.saveReportPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(input.saveReportPath, markdown, 'utf-8');
      savedTo = input.saveReportPath;
      this.logger.log(`Relatório salvo em ${savedTo}`);
    }

    return { report, markdown, savedTo, auditId: stored.id };
  }

  private buildTechnologySummary(scans: RepositoryScan[]): TechnologySummary[] {
    const map = new Map<string, { count: number; affected: number }>();

    for (const scan of scans) {
      const lang = scan.language ?? 'Desconhecida';
      const current = map.get(lang) ?? { count: 0, affected: 0 };
      current.count++;
      if (scan.isAffected) current.affected++;
      map.set(lang, current);
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        repositoryCount: data.count,
        affectedCount: data.affected,
        riskLevel: this.computeRisk(data.affected, data.count),
      }))
      .sort((a, b) => b.repositoryCount - a.repositoryCount);
  }

  private computeRisk(affected: number, total: number): TechnologySummary['riskLevel'] {
    if (affected === 0) return 'none';
    const ratio = affected / total;
    if (ratio >= 0.5) return 'critical';
    if (ratio >= 0.25) return 'high';
    if (ratio > 0) return 'medium';
    return 'low';
  }

  private buildImmediateActions(isAffected: boolean): ImmediateAction[] {
    const actions: ImmediateAction[] = [
      {
        priority: 1,
        title: 'Inspecionar repositórios clonados após 2 de junho de 2026',
        description:
          'Se você clonou repositórios Microsoft/Azure (ex.: Azure/durabletask, azure-functions-host) e abriu no Cursor, VS Code, Claude Code ou Gemini CLI, trate o sistema como comprometido.',
        category: 'credential_rotation',
      },
      {
        priority: 2,
        title: 'Rotacionar credenciais',
        description:
          'Rotacione tokens GitHub, npm, AWS, Azure, GCP, SSH, Kubernetes secrets e variáveis de ambiente se houve exposição.',
        category: 'credential_rotation',
      },
      {
        priority: 3,
        title: 'Auditar GitHub Actions',
        description:
          'Revise workflows que usam Azure/functions-action@v1. Fixe actions por commit SHA, não por tag mutável.',
        category: 'workflow_review',
      },
      {
        priority: 4,
        title: 'Verificar dependências',
        description:
          `Confirme ausência de durabletask 1.4.1–1.4.3 (PyPI) e pacotes @redhatcloudservices no npm. Execute npm audit e pip audit nos projetos ativos.`,
        category: 'dependency_audit',
      },
      {
        priority: 5,
        title: 'Monitorar domínios C2',
        description:
          'Verifique logs de rede por conexões a check.git-service.com e t.m-kosche.com.',
        category: 'monitoring',
      },
      {
        priority: 6,
        title: 'Prevenção contínua',
        description:
          'Habilite branch protection, PyPI Trusted Publishing (OIDC), e inspecione .cursor/, .claude/, .gemini/ e .vscode/tasks.json em repos clonados.',
        category: 'prevention',
      },
    ];

    if (isAffected) {
      actions.unshift({
        priority: 0,
        title: 'AÇÃO URGENTE — Repositórios comprometidos detectados',
        description:
          'Isole as máquinas que abriram os repositórios afetados. Rotacione TODAS as credenciais imediatamente. Não execute código até concluir a limpeza.',
        category: 'credential_rotation',
      });
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  private buildLimitations(
    status: ReturnType<ThreatIntelligenceStore['getStatus']>,
  ): string[] {
    const limitations: string[] = [];

    if (!status.openSourceMalwareEnabled) {
      limitations.push(
        'OpenSourceMalware (check-malicious) não configurado — adicione OSM_API_TOKEN no .env para verificação em tempo real por dependência.',
      );
    }

    limitations.push(
      'GitHub Advisory Database limitada às 1.000 advisories de malware mais recentes (configurável via GITHUB_ADVISORY_MAX_PAGES).',
    );

    return limitations;
  }
}
