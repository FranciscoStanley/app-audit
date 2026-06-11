import { RemediationUseCase } from './remediation.use-case';
import { GitHubRemediationPort } from '../../domain/ports/github-remediation.port';
import { AuditReportStore } from '../../infrastructure/storage/audit-report.store';
import { GitHubTokenResolverService } from './github-token-resolver.service';
import { GitHubRemediationFactory } from '../../infrastructure/github/github-remediation.factory';

describe('RemediationUseCase', () => {
  const finding = {
    id: 'finding-1',
    type: 'exposed_secret' as const,
    severity: 'high' as const,
    message: 'Arquivo sensível',
    evidence: '.npmrc',
    category: 'Secrets Exposure',
    remediationAvailable: true,
    repository: 'owner/repo',
  };

  let auditStore: jest.Mocked<Pick<AuditReportStore, 'findFindingById' | 'getById'>>;
  let githubTokens: jest.Mocked<Pick<GitHubTokenResolverService, 'requireForAudit'>>;
  let remediationFactory: jest.Mocked<Pick<GitHubRemediationFactory, 'create'>>;
  let github: jest.Mocked<GitHubRemediationPort>;
  let useCase: RemediationUseCase;

  beforeEach(() => {
    github = {
      getDefaultBranch: jest.fn(),
      deleteFile: jest.fn(),
      ensureGitignoreEntry: jest.fn(),
      pinWorkflowActions: jest.fn(),
      removeMaliciousContent: jest.fn(),
      fixDependabotAlert: jest.fn(),
      updatePackageVersion: jest.fn(),
      removePackageFromManifest: jest.fn(),
      enableDependabotSecurityUpdates: jest.fn(),
      listDependabotAlerts: jest.fn(),
      createSecurityIssue: jest.fn(),
    };

    auditStore = {
      findFindingById: jest.fn().mockResolvedValue(finding),
      getById: jest.fn(),
    };

    githubTokens = {
      requireForAudit: jest.fn().mockResolvedValue('gh-token'),
    };

    remediationFactory = {
      create: jest.fn().mockReturnValue(github),
    };

    useCase = new RemediationUseCase(
      auditStore as unknown as AuditReportStore,
      githubTokens as unknown as GitHubTokenResolverService,
      remediationFactory as unknown as GitHubRemediationFactory,
    );
  });

  it('marca plano de exposed_secret como totalmente automático', async () => {
    const plan = await useCase.preview('finding-1');
    expect(plan.canAutoApply).toBe(true);
    expect(plan.steps.every((s) => s.automated)).toBe(true);
    expect(plan.steps).toHaveLength(3);
  });

  it('aplica remediação de arquivo sensível sem passos manuais', async () => {
    const result = await useCase.apply('finding-1', 'user-1');

    expect(github.deleteFile).toHaveBeenCalledWith('owner', 'repo', '.npmrc', expect.any(String));
    expect(github.ensureGitignoreEntry).toHaveBeenCalledWith('owner', 'repo', '.npmrc');
    expect(github.createSecurityIssue).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.requiresManualSteps).toHaveLength(0);
  });

  it('corrige alerta dependabot automaticamente', async () => {
    auditStore.findFindingById.mockResolvedValue({
      ...finding,
      type: 'vulnerable_dependency',
      evidence: 'vitest@3.0.5@frontend/package.json#dependabot-42',
    });

    const result = await useCase.apply('finding-1', 'user-1');

    expect(github.fixDependabotAlert).toHaveBeenCalledWith('owner', 'repo', 42);
    expect(github.enableDependabotSecurityUpdates).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
