import { RemediationUseCase } from './remediation.use-case';
import { RemediationConsentUseCase } from './remediation-consent.use-case';
import { GitHubRemediationPort } from '../../domain/ports/github-remediation.port';
import { AuditReportStore } from '../../infrastructure/storage/audit-report.store';
import { GitHubTokenResolverService } from './github-token-resolver.service';
import { GitHubRemediationFactory } from '../../infrastructure/github/github-remediation.factory';
import { RemediationGitWorkspace } from '../../infrastructure/github/remediation-git-workspace';

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

  let auditStore: jest.Mocked<
    Pick<AuditReportStore, 'findFindingById' | 'getById'>
  >;
  let githubTokens: jest.Mocked<
    Pick<GitHubTokenResolverService, 'requireForAudit'>
  >;
  let remediationFactory: jest.Mocked<
    Pick<GitHubRemediationFactory, 'create' | 'createWorkspace'>
  >;
  let github: jest.Mocked<GitHubRemediationPort>;
  let workspace: jest.Mocked<
    Pick<
      RemediationGitWorkspace,
      | 'clone'
      | 'deleteFile'
      | 'ensureGitignoreEntry'
      | 'pinWorkflowActions'
      | 'sanitizeFile'
      | 'updatePackageVersion'
      | 'removePackage'
      | 'regenerateLockfiles'
      | 'deliver'
      | 'cleanup'
    >
  >;
  let remediationConsent: jest.Mocked<
    Pick<RemediationConsentUseCase, 'assertRemediationConsent'>
  >;
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
      listDependabotAlerts: jest.fn().mockResolvedValue([]),
      createSecurityIssue: jest.fn(),
    };

    workspace = {
      clone: jest
        .fn()
        .mockResolvedValue({ repoPath: '/tmp/repo', defaultBranch: 'main' }),
      deleteFile: jest.fn(),
      ensureGitignoreEntry: jest.fn(),
      pinWorkflowActions: jest.fn(),
      sanitizeFile: jest.fn(),
      updatePackageVersion: jest.fn(),
      removePackage: jest.fn(),
      regenerateLockfiles: jest.fn().mockResolvedValue(['pnpm-lock.yaml']),
      deliver: jest.fn().mockResolvedValue({
        method: 'direct_push',
        branch: 'main',
        lockfilesUpdated: [],
        commitSha: 'abc123',
      }),
      cleanup: jest.fn(),
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
      createWorkspace: jest.fn().mockReturnValue(workspace),
    };

    remediationConsent = {
      assertRemediationConsent: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new RemediationUseCase(
      auditStore as unknown as AuditReportStore,
      githubTokens as unknown as GitHubTokenResolverService,
      remediationFactory,
      remediationConsent as unknown as RemediationConsentUseCase,
    );
  });

  it('marca plano de exposed_secret como totalmente automático', async () => {
    const plan = await useCase.preview('finding-1');
    expect(plan.canAutoApply).toBe(true);
    expect(plan.steps.every((s) => s.automated)).toBe(true);
    expect(plan.steps).toHaveLength(3);
  });

  it('aplica remediação via workspace git com commit único', async () => {
    const result = await useCase.apply('finding-1', 'user-1');

    expect(workspace.clone).toHaveBeenCalledWith('owner', 'repo');
    expect(workspace.deleteFile).toHaveBeenCalledWith('/tmp/repo', '.npmrc');
    expect(workspace.ensureGitignoreEntry).toHaveBeenCalledWith(
      '/tmp/repo',
      '.npmrc',
    );
    expect(workspace.deliver).toHaveBeenCalled();
    expect(github.createSecurityIssue).toHaveBeenCalled();
    expect(workspace.cleanup).toHaveBeenCalledWith('/tmp/repo');
    expect(result.success).toBe(true);
    expect(result.delivery?.method).toBe('direct_push');
  });

  it('considera sucesso quando issue de segurança falha por issues desabilitadas', async () => {
    github.createSecurityIssue.mockRejectedValue(
      new Error(
        'gh: Issues has been disabled in this repository. (HTTP 410)',
      ),
    );

    const result = await useCase.apply('finding-1', 'user-1');

    expect(workspace.deliver).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.message).toContain('passo(s) manual(is) pendente(s)');
    expect(result.requiresManualSteps).toHaveLength(1);
    expect(result.requiresManualSteps[0]).toContain('Issues desabilitadas');
  });

  it('remove dependência comprometida quando evidence é URL OpenSourceMalware', async () => {
    auditStore.findFindingById.mockResolvedValue({
      ...finding,
      type: 'compromised_dependency',
      message: '[OpenSourceMalware] Pacote npm malicioso: axios',
      evidence: 'https://opensourcemalware.com/npm/axios',
    });

    const result = await useCase.apply('finding-1', 'user-1');

    expect(workspace.removePackage).toHaveBeenCalledWith(
      '/tmp/repo',
      'package.json',
      'axios',
    );
    expect(workspace.deliver).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('remove dependência com evidence estruturada package.json|pkg|ver|osm', async () => {
    auditStore.findFindingById.mockResolvedValue({
      ...finding,
      type: 'compromised_dependency',
      message: '[OpenSourceMalware] Pacote npm malicioso: axios',
      evidence: 'package.json|axios|1.6.0|osm',
    });

    await useCase.apply('finding-1', 'user-1');

    expect(workspace.removePackage).toHaveBeenCalledWith(
      '/tmp/repo',
      'package.json',
      'axios',
    );
  });

  it('corrige alerta dependabot com lockfile', async () => {
    auditStore.findFindingById.mockResolvedValue({
      ...finding,
      type: 'vulnerable_dependency',
      message: '[Dependabot] vitest vulnerability',
      evidence: 'frontend/package.json|vitest|3.0.5|dependabot-42',
    });

    github.listDependabotAlerts.mockResolvedValue([
      {
        number: 42,
        state: 'open',
        packageName: 'vitest',
        manifestPath: 'frontend/package.json',
        severity: 'critical',
        summary: 'vitest vuln',
        vulnerableVersionRange: '< 3.0.5',
        patchedVersion: '3.0.5',
        ghsaId: 'GHSA-xxxx',
      },
    ]);

    const result = await useCase.apply('finding-1', 'user-1');

    expect(workspace.updatePackageVersion).toHaveBeenCalledWith(
      '/tmp/repo',
      'frontend/package.json',
      'vitest',
      '3.0.5',
    );
    expect(workspace.regenerateLockfiles).toHaveBeenCalledWith(
      '/tmp/repo',
      'frontend/package.json',
    );
    expect(github.enableDependabotSecurityUpdates).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
