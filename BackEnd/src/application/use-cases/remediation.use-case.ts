import { Injectable, NotFoundException } from '@nestjs/common';
import { GitHubRemediationPort } from '../../domain/ports/github-remediation.port';
import {
  RemediationPlan,
  RemediationResult,
  RemediationStep,
} from '../../domain/entities/remediation.entity';
import { ThreatFindingType } from '../../domain/entities/repository-scan.entity';
import { GitHubRemediationFactory } from '../../infrastructure/github/github-remediation.factory';
import { AuditReportStore } from '../../infrastructure/storage/audit-report.store';
import { GitHubTokenResolverService } from './github-token-resolver.service';

@Injectable()
export class RemediationUseCase {
  constructor(
    private readonly auditStore: AuditReportStore,
    private readonly githubTokens: GitHubTokenResolverService,
    private readonly remediationFactory: GitHubRemediationFactory,
  ) {}

  async preview(findingId: string): Promise<RemediationPlan> {
    const finding = await this.auditStore.findFindingById(findingId);
    if (!finding) throw new NotFoundException('Vulnerabilidade não encontrada');

    return this.buildPlan(finding.type, finding.repository, finding.evidence ?? '', findingId);
  }

  async apply(findingId: string, userId: string): Promise<RemediationResult> {
    const finding = await this.auditStore.findFindingById(findingId);
    if (!finding) throw new NotFoundException('Vulnerabilidade não encontrada');

    const token = await this.githubTokens.requireForAudit(userId);
    const github = this.remediationFactory.create(token);
    const [owner, repo] = finding.repository.split('/');
    const plan = this.buildPlan(finding.type, finding.repository, finding.evidence ?? '', findingId);

    const applied: string[] = [];
    const failed: string[] = [];

    for (const step of plan.steps) {
      try {
        await this.executeStep(github, owner, repo, finding.type, finding.evidence ?? '', step);
        applied.push(step.title);
      } catch (error) {
        failed.push(`${step.title}: ${(error as Error).message}`);
      }
    }

    return {
      success: failed.length === 0,
      message:
        failed.length === 0
          ? 'Remediação aplicada com sucesso'
          : `Remediação parcial — ${failed.length} passo(s) falharam`,
      appliedSteps: applied,
      requiresManualSteps: failed,
    };
  }

  async applyAll(auditId: string, userId: string): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ findingId: string; message: string; success: boolean }>;
  }> {
    const stored = await this.auditStore.getById(auditId);
    if (!stored) throw new NotFoundException('Relatório não encontrado');

    const repos = stored.report.allRepositories ?? stored.report.affectedRepositories;
    const findings = repos.flatMap((repo) =>
      repo.findings.filter((f) => f.remediationAvailable).map((f) => ({ ...f, repository: repo.fullName })),
    );

    const results: Array<{ findingId: string; message: string; success: boolean }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const finding of findings) {
      const result = await this.apply(finding.id, userId);
      results.push({ findingId: finding.id, message: result.message, success: result.success });
      if (result.success) succeeded++;
      else failed++;
    }

    return { total: findings.length, succeeded, failed, results };
  }

  private async executeStep(
    github: GitHubRemediationPort,
    owner: string,
    repo: string,
    type: ThreatFindingType,
    evidence: string,
    step: RemediationStep,
  ): Promise<void> {
    switch (step.action) {
      case 'delete_file':
        await github.deleteFile(owner, repo, evidence, `security: remove ${evidence}`);
        return;

      case 'gitignore':
        await github.ensureGitignoreEntry(owner, repo, evidence);
        return;

      case 'pin_actions':
        await github.pinWorkflowActions(owner, repo, evidence);
        return;

      case 'enable_dependabot':
        await github.enableDependabotSecurityUpdates(owner, repo);
        return;

      case 'fix_dependabot':
        await github.fixDependabotAlert(owner, repo, this.parseDependabotAlertNumber(evidence));
        return;

      case 'update_dependency': {
        const { packageName, version, manifestPath } = this.parseDependencyEvidence(evidence);
        await github.updatePackageVersion(owner, repo, packageName, version, manifestPath);
        return;
      }

      case 'remove_dependency': {
        const { packageName, manifestPath } = this.parseDependencyEvidence(evidence);
        await github.removePackageFromManifest(owner, repo, packageName, manifestPath);
        return;
      }

      case 'sanitize_workflow': {
        const { workflowPath, patterns } = this.parseC2Evidence(evidence);
        await github.removeMaliciousContent(owner, repo, workflowPath, patterns);
        return;
      }

      case 'security_issue':
        await github.createSecurityIssue(owner, repo, step.title, step.description);
        return;

      default:
        throw new Error(`Passo não suportado: ${step.title}`);
    }
  }

  private buildPlan(
    type: ThreatFindingType,
    repository: string,
    evidence: string,
    findingId: string,
  ): RemediationPlan {
    const steps: RemediationStep[] = [];

    switch (type) {
      case 'malicious_file':
      case 'malicious_pattern':
        steps.push({
          order: 1,
          title: 'Remover arquivo malicioso',
          description: `Excluir ${evidence} do repositório`,
          action: 'delete_file',
          automated: true,
        });
        steps.push({
          order: 2,
          title: 'Registrar incidente de segurança',
          description: 'Criar issue de rastreamento para rotação de credenciais',
          action: 'security_issue',
          automated: true,
        });
        break;

      case 'exposed_secret':
        steps.push({
          order: 1,
          title: 'Remover arquivo sensível',
          description: `Remover ${evidence} do branch padrão`,
          action: 'delete_file',
          automated: true,
        });
        steps.push({
          order: 2,
          title: 'Adicionar ao .gitignore',
          description: `Garantir que ${evidence} está no .gitignore`,
          action: 'gitignore',
          automated: true,
        });
        steps.push({
          order: 3,
          title: 'Abrir issue de rotação de credenciais',
          description: `Credencial em ${evidence} — rotacionar tokens associados`,
          action: 'security_issue',
          automated: true,
        });
        break;

      case 'unpinned_action':
      case 'compromised_action':
        steps.push({
          order: 1,
          title: 'Fixar GitHub Action por SHA',
          description: `Substituir tags mutáveis por commit SHA em ${evidence}`,
          action: 'pin_actions',
          automated: true,
        });
        break;

      case 'compromised_dependency':
      case 'malware_advisory':
        steps.push({
          order: 1,
          title: 'Remover dependência comprometida',
          description: `Remover pacote malicioso: ${evidence}`,
          action: 'remove_dependency',
          automated: true,
        });
        steps.push({
          order: 2,
          title: 'Habilitar Dependabot security updates',
          description: 'Garantir atualizações automáticas de segurança no repositório',
          action: 'enable_dependabot',
          automated: true,
        });
        break;

      case 'vulnerable_dependency':
        if (evidence.includes('dependabot-')) {
          steps.push({
            order: 1,
            title: 'Corrigir alerta Dependabot',
            description: evidence,
            action: 'fix_dependabot',
            automated: true,
          });
        } else {
          steps.push({
            order: 1,
            title: 'Atualizar dependência vulnerável',
            description: `Atualizar pacote: ${evidence}`,
            action: 'update_dependency',
            automated: true,
          });
        }
        steps.push({
          order: 2,
          title: 'Habilitar Dependabot security updates',
          description: 'Garantir atualizações automáticas de segurança no repositório',
          action: 'enable_dependabot',
          automated: true,
        });
        break;

      case 'c2_domain':
        steps.push({
          order: 1,
          title: 'Remover referência a domínio C2',
          description: `Sanitizar workflow removendo domínios maliciosos`,
          action: 'sanitize_workflow',
          automated: true,
        });
        break;

      default:
        steps.push({
          order: 1,
          title: 'Revisão de segurança',
          description: 'Criar issue para análise do achado',
          action: 'security_issue',
          automated: true,
        });
    }

    return {
      findingId,
      repository,
      action: this.mapAction(type),
      steps,
      canAutoApply: steps.every((s) => s.automated),
      estimatedImpact: ['malicious_file', 'exposed_secret', 'c2_domain'].includes(type) ? 'high' : 'medium',
    };
  }

  private mapAction(type: ThreatFindingType) {
    const map: Record<string, RemediationPlan['action']> = {
      malicious_file: 'remove_file',
      malicious_pattern: 'remove_file',
      exposed_secret: 'rotate_secret',
      unpinned_action: 'pin_github_action',
      compromised_action: 'pin_github_action',
      compromised_dependency: 'update_dependency',
      malware_advisory: 'update_dependency',
      vulnerable_dependency: 'update_dependency',
      c2_domain: 'remove_file',
    };
    return map[type] ?? 'manual_review';
  }

  private parseDependabotAlertNumber(evidence: string): number {
    const match = evidence.match(/dependabot-(\d+)/);
    if (!match) throw new Error(`Número de alerta Dependabot inválido: ${evidence}`);
    return Number.parseInt(match[1], 10);
  }

  private parseDependencyEvidence(evidence: string): {
    packageName: string;
    version: string;
    manifestPath?: string;
  } {
    const dependabotPipe = evidence.match(/^(.+?)\|(.+?)\|(.+?)\|dependabot-(\d+)$/);
    if (dependabotPipe) {
      return {
        manifestPath: dependabotPipe[1],
        packageName: dependabotPipe[2],
        version: dependabotPipe[3],
      };
    }

    const atMatch = evidence.match(/^(.+?)@(.+)$/);
    if (atMatch) {
      return { packageName: atMatch[1], version: atMatch[2] };
    }

    return { packageName: evidence, version: 'latest' };
  }

  private parseC2Evidence(evidence: string): { workflowPath: string; patterns: string[] } {
    const [workflowPath, ...domains] = evidence.split('|');
    return {
      workflowPath,
      patterns: domains.length > 0 ? domains : [workflowPath],
    };
  }
}
