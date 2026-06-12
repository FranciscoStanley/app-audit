import { Injectable, NotFoundException } from '@nestjs/common';
import { RemediationConsentUseCase } from './remediation-consent.use-case';
import type { DeliveryResult } from '../../domain/ports/github-remediation.port';
import { GitHubRemediationPort } from '../../domain/ports/github-remediation.port';
import {
  RemediationPlan,
  RemediationResult,
  RemediationStep,
} from '../../domain/entities/remediation.entity';
import {
  ThreatFinding,
  ThreatFindingType,
} from '../../domain/entities/repository-scan.entity';
import { GitHubRemediationFactory } from '../../infrastructure/github/github-remediation.factory';
import { sanitizeGitError } from '../../infrastructure/github/git-error.util';
import { RemediationGitWorkspace } from '../../infrastructure/github/remediation-git-workspace';
import { AuditReportStore } from '../../infrastructure/storage/audit-report.store';
import { GitHubTokenResolverService } from './github-token-resolver.service';

const API_ONLY_ACTIONS = new Set(['enable_dependabot', 'security_issue']);

interface RemediationApplyContext {
  dependabotAlertNumbers: number[];
}

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
    const applyContext: RemediationApplyContext = {
      dependabotAlertNumbers: [],
    };

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
              applyContext,
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
            failed.push(
              `${step.title}: ${sanitizeGitError((error as Error).message)}`,
            );
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
            failed.push(
              `Regenerar lockfile: ${sanitizeGitError((error as Error).message)}`,
            );
          }
        }

        if (failed.length === 0) {
          try {
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
          } catch (error) {
            failed.push(
              `Entrega (commit/push): ${sanitizeGitError((error as Error).message)}`,
            );
          }
        }
      } catch (error) {
        failed.push(`Workspace: ${sanitizeGitError((error as Error).message)}`);
      } finally {
        if (repoPath) await workspace.cleanup(repoPath);
      }
    }

    for (const step of apiSteps) {
      try {
        await this.executeApiStep(github, owner, repo, step);
        applied.push(step.title);
      } catch (error) {
        const detail = `${step.title}: ${sanitizeGitError((error as Error).message)}`;
        if (step.action === 'security_issue') {
          optionalFailed.push(this.formatSecurityIssueFailure(step, error));
        } else {
          failed.push(detail);
        }
      }
    }

    let dependabotSync: RemediationResult['dependabot'];
    if (applyContext.dependabotAlertNumbers.length > 0 && failed.length === 0) {
      dependabotSync = await this.syncDependabotAlertsAfterDelivery(
        github,
        owner,
        repo,
        applyContext.dependabotAlertNumbers,
        delivery,
      );
      if (dependabotSync.closedAlertNumbers.length > 0) {
        applied.push(
          `Dependabot GitHub: ${dependabotSync.closedAlertNumbers.length} alerta(s) fechado(s)`,
        );
      }
      if (
        dependabotSync.stillOpenAlertNumbers.length > 0 &&
        delivery?.method === 'pull_request'
      ) {
        optionalFailed.push(
          `${dependabotSync.stillOpenAlertNumbers.length} alerta(s) Dependabot fecham após merge da PR na branch padrão`,
        );
      }
    }

    const result = this.buildResult(
      failed,
      applied,
      delivery,
      optionalFailed,
      dependabotSync,
    );

    if (result.success) {
      await this.markFindingsRemediated(finding.auditId, finding);
    }

    return result;
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

    const dedupedFindings = this.deduplicateFindings(findings);

    const results: Array<{
      findingId: string;
      message: string;
      success: boolean;
      pullRequestUrl?: string;
    }> = [];
    let succeeded = 0;
    let failed = 0;
    const total = dedupedFindings.length;

    for (const finding of dedupedFindings) {
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

    return { total: dedupedFindings.length, succeeded, failed, results };
  }

  private deduplicateFindings<
    T extends {
      id: string;
      repository: string;
      evidence?: string;
      message: string;
    },
  >(findings: T[]): T[] {
    const seen = new Map<string, T>();
    for (const finding of findings) {
      const key = this.findingRemediationGroupKey(
        finding.repository,
        finding.evidence ?? '',
        finding.message,
        finding.id,
      );
      if (!seen.has(key)) {
        seen.set(key, finding);
      }
    }
    return [...seen.values()];
  }

  private async markFindingsRemediated(
    auditId: string,
    finding: ThreatFinding & { repository: string },
  ): Promise<void> {
    const stored = await this.auditStore.getById(auditId);
    if (!stored) return;

    const idsToRemove = new Set<string>([finding.id]);
    const repos =
      stored.report.allRepositories ??
      stored.report.affectedRepositories ??
      [];

    for (const repo of repos) {
      if (repo.fullName !== finding.repository) continue;
      for (const other of repo.findings) {
        if (other.id === finding.id) continue;
        if (this.areFindingsResolvedTogether(finding, other)) {
          idsToRemove.add(other.id);
        }
      }
    }

    await this.auditStore.removeFindings(auditId, [...idsToRemove]);
  }

  private areFindingsResolvedTogether(
    primary: ThreatFinding,
    other: ThreatFinding,
  ): boolean {
    if (primary.type !== other.type) return false;

    switch (primary.type) {
      case 'unpinned_action':
      case 'compromised_action':
      case 'exposed_secret':
      case 'malicious_file':
      case 'malicious_pattern':
      case 'c2_domain':
        return primary.evidence === other.evidence;

      case 'vulnerable_dependency':
        if (
          primary.evidence?.includes('dependabot-') &&
          other.evidence?.includes('dependabot-')
        ) {
          return (
            this.findingRemediationGroupKey(
              '',
              primary.evidence ?? '',
              primary.message,
              primary.id,
            ) ===
            this.findingRemediationGroupKey(
              '',
              other.evidence ?? '',
              other.message,
              other.id,
            )
          );
        }
        return primary.evidence === other.evidence;

      case 'compromised_dependency':
      case 'malware_advisory': {
        const primaryPkg = this.parseDependencyEvidence(
          primary.evidence ?? '',
          primary.message,
        ).packageName;
        const otherPkg = this.parseDependencyEvidence(
          other.evidence ?? '',
          other.message,
        ).packageName;
        return primaryPkg === otherPkg;
      }

      default:
        return false;
    }
  }

  private findingRemediationGroupKey(
    repository: string,
    evidence: string,
    message: string,
    findingId: string,
  ): string {
    if (evidence.includes('dependabot-')) {
      const { packageName, version } = this.parseDependencyEvidence(
        evidence,
        message,
      );
      return `${repository}|dependabot|${packageName}|${version}`;
    }
    return findingId;
  }

  private async syncDependabotAlertsAfterDelivery(
    github: GitHubRemediationPort,
    owner: string,
    repo: string,
    alertNumbers: number[],
    delivery?: DeliveryResult,
  ): Promise<NonNullable<RemediationResult['dependabot']>> {
    const targeted = [...new Set(alertNumbers)];

    if (delivery?.method === 'pull_request') {
      return {
        targetedAlertNumbers: targeted,
        closedAlertNumbers: [],
        stillOpenAlertNumbers: targeted,
      };
    }

    const { closed, stillOpen } = await github.waitForDependabotAlertsClosed(
      owner,
      repo,
      targeted,
    );

    return {
      targetedAlertNumbers: targeted,
      closedAlertNumbers: closed,
      stillOpenAlertNumbers: stillOpen,
    };
  }

  private async fixRelatedDependabotAlertsInWorkspace(
    workspace: RemediationGitWorkspace,
    github: GitHubRemediationPort,
    repoPath: string,
    owner: string,
    repo: string,
    alertNumber: number,
  ): Promise<number[]> {
    const alerts = await github.listDependabotAlerts(owner, repo);
    const primary = alerts.find((a) => a.number === alertNumber);
    if (!primary) {
      throw new Error(
        `Alerta Dependabot #${alertNumber} não encontrado ou já foi fechado no GitHub`,
      );
    }

    const related = alerts.filter(
      (a) =>
        a.packageName === primary.packageName &&
        (primary.ghsaId
          ? a.ghsaId === primary.ghsaId
          : a.summary === primary.summary),
    );

    const fixedNumbers: number[] = [];
    for (const alert of related) {
      if (!alert.patchedVersion) continue;
      await workspace.updatePackageVersion(
        repoPath,
        alert.manifestPath,
        alert.packageName,
        alert.patchedVersion,
      );
      fixedNumbers.push(alert.number);
    }

    if (fixedNumbers.length === 0) {
      if (!primary.patchedVersion) {
        await github.fixDependabotAlert(owner, repo, alertNumber);
        return [alertNumber];
      }
      throw new Error(
        `Alerta #${alertNumber} (${primary.packageName}) sem versão corrigida disponível`,
      );
    }

    return fixedNumbers;
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
    applyContext: RemediationApplyContext,
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
        const fixed = await this.fixRelatedDependabotAlertsInWorkspace(
          workspace,
          github,
          repoPath,
          owner,
          repo,
          alertNumber,
        );
        applyContext.dependabotAlertNumbers.push(...fixed);
        return;
      }

      case 'update_dependency': {
        const parsed = this.parseDependencyEvidence(evidence, message);
        const { packageName, manifestPath } = parsed;
        let { version } = parsed;
        if (
          this.isUnstableInitialVersion(version) ||
          /versão inicial instável/i.test(message)
        ) {
          version = await workspace.resolveLatestNpmVersion(packageName);
        }
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
    dependabot?: RemediationResult['dependabot'],
  ): RemediationResult {
    if (failed.length === 0) {
      let message = 'Remediação aplicada com sucesso';
      if (dependabot?.closedAlertNumbers.length) {
        message = `Remediação aplicada — ${dependabot.closedAlertNumbers.length} alerta(s) Dependabot fechado(s) no GitHub`;
      }
      if (optionalFailed.length > 0) {
        message = dependabot?.closedAlertNumbers.length
          ? `${message} — ${optionalFailed.length} passo(s) manual(is) pendente(s)`
          : `Remediação aplicada — ${optionalFailed.length} passo(s) manual(is) pendente(s)`;
      }
      if (delivery?.method === 'pull_request' && delivery.pullRequestUrl) {
        message =
          optionalFailed.length > 0
            ? `Remediação aplicada via PR — ${optionalFailed.length} passo(s) manual(is) pendente(s)`
            : `Remediação aplicada — Pull Request criado: ${delivery.pullRequestUrl}`;
      } else if (delivery?.method === 'no_changes') {
        message =
          optionalFailed.length > 0
            ? `Repositório já atualizado — ${optionalFailed.length} passo(s) manual(is) pendente(s)`
            : 'Remediação concluída — repositório já estava atualizado (nenhum commit necessário)';
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
        dependabot,
      };
    }

    return {
      success: false,
      message: `Remediação parcial — ${failed.length} passo(s) falharam`,
      appliedSteps: applied,
      requiresManualSteps: [...failed, ...optionalFailed],
      delivery,
      dependabot,
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
          const alertNum = evidence.match(/dependabot-(\d+)/)?.[1];
          steps.push(
            {
              order: 1,
              title: 'Corrigir alerta Dependabot',
              description: alertNum
                ? `Atualizar pacote em todos os manifestos do monorepo (alerta #${alertNum})`
                : evidence,
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

  private isUnstableInitialVersion(version: string): boolean {
    return /^\^?0\.|^~?0\./.test(version.trim());
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
