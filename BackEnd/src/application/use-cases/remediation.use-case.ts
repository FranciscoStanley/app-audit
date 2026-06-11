import { Injectable, NotFoundException } from '@nestjs/common';
import { RemediationConsentUseCase } from './remediation-consent.use-case';
import type { DeliveryResult } from '../../domain/ports/github-remediation.port';
import { GitHubRemediationPort } from '../../domain/ports/github-remediation.port';
import {
  RemediationPlan,
  RemediationResult,
  RemediationStep,
} from '../../domain/entities/remediation.entity';
import { ThreatFindingType } from '../../domain/entities/repository-scan.entity';
import { GitHubRemediationFactory } from '../../infrastructure/github/github-remediation.factory';
import { RemediationGitWorkspace } from '../../infrastructure/github/remediation-git-workspace';
import { AuditReportStore } from '../../infrastructure/storage/audit-report.store';
import { GitHubTokenResolverService } from './github-token-resolver.service';

const API_ONLY_ACTIONS = new Set(['enable_dependabot', 'security_issue']);

@Injectable()
export class RemediationUseCase {
  constructor(
    private readonly auditStore: AuditReportStore,
    private readonly githubTokens: GitHubTokenResolverService,
    private readonly remediationFactory: GitHubRemediationFactory,
    private readonly remediationConsent: RemediationConsentUseCase,
  ) {}

  async preview(findingId: string): Promise<RemediationPlan> {
    const finding = await this.auditStore.findFindingById(findingId);
    if (!finding) throw new NotFoundException('Vulnerabilidade não encontrada');

    return this.buildPlan(
      finding.type,
      finding.repository,
      finding.evidence ?? '',
      findingId,
      finding.message,
    );
  }

  async apply(findingId: string, userId: string): Promise<RemediationResult> {
    await this.remediationConsent.assertRemediationConsent(userId);

    const finding = await this.auditStore.findFindingById(findingId);
    if (!finding) throw new NotFoundException('Vulnerabilidade não encontrada');

    const token = await this.githubTokens.requireForAudit(userId);
    const github = this.remediationFactory.create(token);
    const [owner, repo] = finding.repository.split('/');
    const plan = this.buildPlan(
      finding.type,
      finding.repository,
      finding.evidence ?? '',
      findingId,
      finding.message,
    );

    const applied: string[] = [];
    const failed: string[] = [];
    const optionalFailed: string[] = [];
    let delivery: DeliveryResult | undefined;

    const workspaceSteps = plan.steps.filter(
      (s) => s.action && !API_ONLY_ACTIONS.has(s.action),
    );
    const apiSteps = plan.steps.filter(
      (s) => s.action && API_ONLY_ACTIONS.has(s.action),
    );

    if (workspaceSteps.length > 0) {
      const workspace = this.remediationFactory.createWorkspace(token);
      let repoPath = '';
      try {
        const cloned = await workspace.clone(owner, repo);
        repoPath = cloned.repoPath;

        let needsLockfile = false;
        let manifestPath: string | undefined;

        for (const step of workspaceSteps) {
          try {
            if (step.action === 'regenerate_lockfile') continue;
            await this.applyWorkspaceStep(
              workspace,
              github,
              repoPath,
              owner,
              repo,
              finding.type,
              finding.evidence ?? '',
              finding.message,
              step,
            );
            applied.push(step.title);
            if (
              [
                'fix_dependabot',
                'update_dependency',
                'remove_dependency',
              ].includes(step.action ?? '')
            ) {
              needsLockfile = true;
              manifestPath = this.parseDependencyEvidence(
                finding.evidence ?? '',
                finding.message,
              ).manifestPath;
            }
          } catch (error) {
            failed.push(`${step.title}: ${(error as Error).message}`);
          }
        }

        let lockfilesUpdated: string[] = [];

        if (needsLockfile && failed.length === 0) {
          try {
            lockfilesUpdated = await workspace.regenerateLockfiles(
              repoPath,
              manifestPath,
            );
            if (lockfilesUpdated.length > 0) {
              applied.push(
                `Regenerar lockfile (${lockfilesUpdated.join(', ')})`,
              );
            }
          } catch (error) {
            failed.push(`Regenerar lockfile: ${(error as Error).message}`);
          }
        }

        if (failed.length === 0) {
          delivery = await workspace.deliver(
            repoPath,
            owner,
            repo,
            cloned.defaultBranch,
            `security: automated remediation (${finding.type})`,
            `security: correção automática — ${finding.message.slice(0, 80)}`,
            this.buildPullRequestBody(
              finding.type,
              finding.message,
              finding.evidence ?? '',
            ),
          );
          delivery = { ...delivery, lockfilesUpdated };
        }
      } catch (error) {
        failed.push(`Workspace: ${(error as Error).message}`);
      } finally {
        if (repoPath) await workspace.cleanup(repoPath);
      }
    }

    for (const step of apiSteps) {
      try {
        await this.executeApiStep(github, owner, repo, step);
        applied.push(step.title);
      } catch (error) {
        const detail = `${step.title}: ${(error as Error).message}`;
        if (step.action === 'security_issue') {
          optionalFailed.push(this.formatSecurityIssueFailure(step, error));
        } else {
          failed.push(detail);
        }
      }
    }

    return this.buildResult(failed, applied, delivery, optionalFailed);
  }

  async applyAll(
    auditId: string,
    userId: string,
    options?: {
      onProgress?: (progress: {
        completed: number;
        total: number;
        currentFindingId?: string;
      }) => void | Promise<void>;
    },
  ): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{
      findingId: string;
      message: string;
      success: boolean;
      pullRequestUrl?: string;
    }>;
  }> {
    await this.remediationConsent.assertRemediationConsent(userId);

    const stored = await this.auditStore.getById(auditId);
    if (!stored) throw new NotFoundException('Relatório não encontrado');

    const repos =
      stored.report.allRepositories ?? stored.report.affectedRepositories;
    const findings = repos.flatMap((r) =>
      r.findings
        .filter((f) => f.remediationAvailable)
        .map((f) => ({ ...f, repository: r.fullName })),
    );

    const results: Array<{
      findingId: string;
      message: string;
      success: boolean;
      pullRequestUrl?: string;
    }> = [];
    let succeeded = 0;
    let failed = 0;
    const total = findings.length;

    for (const finding of findings) {
      const result = await this.apply(finding.id, userId);
      results.push({
        findingId: finding.id,
        message: result.message,
        success: result.success,
        pullRequestUrl: result.delivery?.pullRequestUrl,
      });
      if (result.success) succeeded++;
      else failed++;
      await options?.onProgress?.({
        completed: results.length,
        total,
        currentFindingId: finding.id,
      });
    }

    return { total: findings.length, succeeded, failed, results };
  }

  private async applyWorkspaceStep(
    workspace: RemediationGitWorkspace,
    github: GitHubRemediationPort,
    repoPath: string,
    owner: string,
    repo: string,
    type: ThreatFindingType,
    evidence: string,
    message: string,
    step: RemediationStep,
  ): Promise<void> {
    switch (step.action) {
      case 'delete_file':
        await workspace.deleteFile(repoPath, evidence);
        return;

      case 'gitignore':
        await workspace.ensureGitignoreEntry(repoPath, evidence);
        return;

      case 'pin_actions':
        await workspace.pinWorkflowActions(repoPath, evidence);
        return;

      case 'fix_dependabot': {
        const alertNumber = this.parseDependabotAlertNumber(evidence);
        const alerts = await github.listDependabotAlerts(owner, repo);
        const alert = alerts.find((a) => a.number === alertNumber);
        if (!alert?.patchedVersion) {
          await github.fixDependabotAlert(owner, repo, alertNumber);
          return;
        }
        await workspace.updatePackageVersion(
          repoPath,
          alert.manifestPath,
          alert.packageName,
          alert.patchedVersion,
        );
        return;
      }

      case 'update_dependency': {
        const { packageName, version, manifestPath } =
          this.parseDependencyEvidence(evidence, message);
        await workspace.updatePackageVersion(
          repoPath,
          manifestPath ?? 'package.json',
          packageName,
          version,
        );
        return;
      }

      case 'remove_dependency': {
        const { packageName, manifestPath } = this.parseDependencyEvidence(
          evidence,
          message,
        );
        await workspace.removePackage(
          repoPath,
          manifestPath ?? 'package.json',
          packageName,
        );
        return;
      }

      case 'sanitize_workflow': {
        const { workflowPath, patterns } = this.parseC2Evidence(evidence);
        await workspace.sanitizeFile(repoPath, workflowPath, patterns);
        return;
      }

      default:
        throw new Error(`Passo de workspace não suportado: ${step.title}`);
    }
  }

  private async executeApiStep(
    github: GitHubRemediationPort,
    owner: string,
    repo: string,
    step: RemediationStep,
  ): Promise<void> {
    switch (step.action) {
      case 'enable_dependabot':
        await github.enableDependabotSecurityUpdates(owner, repo);
        return;
      case 'security_issue':
        await github.createSecurityIssue(
          owner,
          repo,
          step.title,
          step.description,
        );
        return;
      default:
        throw new Error(`Passo de API não suportado: ${step.title}`);
    }
  }

  private formatSecurityIssueFailure(
    step: RemediationStep,
    error: unknown,
  ): string {
    const msg = (error as Error).message ?? String(error);
    if (/issues has been disabled|issues are disabled|410/i.test(msg)) {
      return `${step.title}: Issues desabilitadas no repositório — rotacione credenciais manualmente`;
    }
    return `${step.title}: ${msg}`;
  }

  private buildResult(
    failed: string[],
    applied: string[],
    delivery?: DeliveryResult,
    optionalFailed: string[] = [],
  ): RemediationResult {
    if (failed.length === 0) {
      let message = 'Remediação aplicada com sucesso';
      if (optionalFailed.length > 0) {
        message = `Remediação aplicada — ${optionalFailed.length} passo(s) manual(is) pendente(s)`;
      }
      if (delivery?.method === 'pull_request' && delivery.pullRequestUrl) {
        message =
          optionalFailed.length > 0
            ? `Remediação aplicada via PR — ${optionalFailed.length} passo(s) manual(is) pendente(s)`
            : `Remediação aplicada — Pull Request criado: ${delivery.pullRequestUrl}`;
      } else if (delivery?.lockfilesUpdated?.length) {
        message =
          optionalFailed.length > 0
            ? `Remediação aplicada — lockfiles atualizados; ${optionalFailed.length} passo(s) manual(is) pendente(s)`
            : `Remediação aplicada — lockfiles atualizados: ${delivery.lockfilesUpdated.join(', ')}`;
      }
      return {
        success: true,
        message,
        appliedSteps: applied,
        requiresManualSteps: optionalFailed,
        delivery,
      };
    }

    return {
      success: false,
      message: `Remediação parcial — ${failed.length} passo(s) falharam`,
      appliedSteps: applied,
      requiresManualSteps: [...failed, ...optionalFailed],
      delivery,
    };
  }

  private buildPullRequestBody(
    type: string,
    message: string,
    evidence: string,
  ): string {
    return [
      '## Correção automática — App Audit',
      '',
      `- **Tipo:** ${type}`,
      `- **Achado:** ${message}`,
      `- **Evidência:** ${evidence}`,
      '',
      'Esta PR foi gerada automaticamente pela plataforma App Audit.',
      '',
      '### Checklist',
      '- [ ] Revisar diff de dependências e lockfile',
      '- [ ] Rodar CI/CD',
      '- [ ] Rotacionar credenciais se o achado envolver secrets',
    ].join('\n');
  }

  private buildPlan(
    type: ThreatFindingType,
    repository: string,
    evidence: string,
    findingId: string,
    message?: string,
  ): RemediationPlan {
    const steps: RemediationStep[] = [];

    switch (type) {
      case 'malicious_file':
      case 'malicious_pattern':
        steps.push(
          {
            order: 1,
            title: 'Remover arquivo malicioso',
            description: `Excluir ${evidence}`,
            action: 'delete_file',
            automated: true,
          },
          {
            order: 2,
            title: 'Registrar incidente de segurança',
            description: 'Issue de rastreamento',
            action: 'security_issue',
            automated: true,
          },
        );
        break;

      case 'exposed_secret':
        steps.push(
          {
            order: 1,
            title: 'Remover arquivo sensível',
            description: `Remover ${evidence}`,
            action: 'delete_file',
            automated: true,
          },
          {
            order: 2,
            title: 'Adicionar ao .gitignore',
            description: `Proteger ${evidence}`,
            action: 'gitignore',
            automated: true,
          },
          {
            order: 3,
            title: 'Abrir issue de rotação de credenciais',
            description: 'Rastrear rotação',
            action: 'security_issue',
            automated: true,
          },
        );
        break;

      case 'unpinned_action':
      case 'compromised_action':
        steps.push({
          order: 1,
          title: 'Fixar GitHub Action por SHA',
          description: `Fixar actions em ${evidence}`,
          action: 'pin_actions',
          automated: true,
        });
        break;

      case 'compromised_dependency':
      case 'malware_advisory': {
        const parsed = this.parseDependencyEvidence(evidence, message);
        const description = this.looksLikeNonPackageEvidence(evidence)
          ? parsed.packageName
          : evidence;
        steps.push(
          {
            order: 1,
            title: 'Remover dependência comprometida',
            description,
            action: 'remove_dependency',
            automated: true,
          },
          {
            order: 2,
            title: 'Regenerar lockfile',
            description: 'Atualizar pnpm/npm/yarn lock',
            action: 'regenerate_lockfile',
            automated: true,
          },
          {
            order: 3,
            title: 'Habilitar Dependabot security updates',
            description: 'Atualizações automáticas',
            action: 'enable_dependabot',
            automated: true,
          },
        );
        break;
      }

      case 'vulnerable_dependency':
        if (evidence.includes('dependabot-')) {
          steps.push(
            {
              order: 1,
              title: 'Corrigir alerta Dependabot',
              description: evidence,
              action: 'fix_dependabot',
              automated: true,
            },
            {
              order: 2,
              title: 'Regenerar lockfile',
              description: 'Fechar alerta no GitHub',
              action: 'regenerate_lockfile',
              automated: true,
            },
          );
        } else {
          steps.push(
            {
              order: 1,
              title: 'Atualizar dependência vulnerável',
              description: evidence,
              action: 'update_dependency',
              automated: true,
            },
            {
              order: 2,
              title: 'Regenerar lockfile',
              description: 'Sincronizar lockfile',
              action: 'regenerate_lockfile',
              automated: true,
            },
          );
        }
        steps.push({
          order: steps.length + 1,
          title: 'Habilitar Dependabot security updates',
          description: 'Atualizações automáticas',
          action: 'enable_dependabot',
          automated: true,
        });
        break;

      case 'c2_domain':
        steps.push({
          order: 1,
          title: 'Remover referência a domínio C2',
          description: 'Sanitizar workflow',
          action: 'sanitize_workflow',
          automated: true,
        });
        break;

      default:
        steps.push({
          order: 1,
          title: 'Revisão de segurança',
          description: 'Criar issue',
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
      estimatedImpact: [
        'malicious_file',
        'exposed_secret',
        'c2_domain',
      ].includes(type)
        ? 'high'
        : 'medium',
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
    if (!match)
      throw new Error(`Número de alerta Dependabot inválido: ${evidence}`);
    return Number.parseInt(match[1], 10);
  }

  private parseDependencyEvidence(
    evidence: string,
    message?: string,
  ): {
    packageName: string;
    version: string;
    manifestPath?: string;
  } {
    const normalizedEvidence = evidence.trim();

    if (this.looksLikeNonPackageEvidence(normalizedEvidence)) {
      const fromMessage = this.extractPackageFromMessage(message);
      if (fromMessage) {
        return {
          packageName: fromMessage,
          version: 'latest',
          manifestPath: 'package.json',
        };
      }
    }

    const dependabotPipe = normalizedEvidence.match(
      /^(.+?)\|(.+?)\|(.+?)\|dependabot-(\d+)$/,
    );
    if (dependabotPipe) {
      return {
        manifestPath: dependabotPipe[1],
        packageName: dependabotPipe[2],
        version: dependabotPipe[3],
      };
    }

    const structuredPipe = normalizedEvidence.match(
      /^(.+?)\|([^|]+)\|([^|]+)\|(osm|ghsa|threat-intel|scope)$/i,
    );
    if (structuredPipe) {
      return {
        manifestPath: structuredPipe[1],
        packageName: structuredPipe[2],
        version: structuredPipe[3],
      };
    }

    const osmUrlMatch = normalizedEvidence.match(
      /opensourcemalware\.com\/(?:npm|pypi)\/([^/?#\s]+)/i,
    );
    if (osmUrlMatch) {
      return {
        packageName: osmUrlMatch[1],
        version: 'latest',
        manifestPath: 'package.json',
      };
    }

    const atMatch = normalizedEvidence.match(
      /^([^@/\\]+(?:\/[^@/\\]+)?)@(.+)$/,
    );
    if (atMatch && !normalizedEvidence.startsWith('http')) {
      return { packageName: atMatch[1], version: atMatch[2] };
    }

    const fromMessage = this.extractPackageFromMessage(message);
    if (fromMessage && this.looksLikeNonPackageEvidence(normalizedEvidence)) {
      return {
        packageName: fromMessage,
        version: 'latest',
        manifestPath: 'package.json',
      };
    }

    return {
      packageName: normalizedEvidence,
      version: 'latest',
      manifestPath: 'package.json',
    };
  }

  private extractPackageFromMessage(message?: string): string | null {
    if (!message) return null;
    const patterns = [
      /(?:malicioso|comprometida|monitorado):\s*([@\w][\w./-]*)/i,
      /Dependência npm comprometida:\s*([@\w][\w./-]*)/i,
      /Pacote npm malicioso:\s*([@\w][\w./-]*)/i,
      /Pacote PyPI comprometido:\s*([@\w][\w./-]*)/i,
    ];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match?.[1]) {
        return match[1].split('@')[0] ?? null;
      }
    }
    return null;
  }

  private looksLikeNonPackageEvidence(evidence: string): boolean {
    const value = evidence.trim();
    return (
      value.startsWith('http') ||
      value.includes('opensourcemalware.com') ||
      value.includes('github.com/advisories') ||
      value.includes('://')
    );
  }

  private parseC2Evidence(evidence: string): {
    workflowPath: string;
    patterns: string[];
  } {
    const [workflowPath, ...domains] = evidence.split('|');
    return {
      workflowPath,
      patterns: domains.length > 0 ? domains : [workflowPath],
    };
  }
}
