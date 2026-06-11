export interface DependabotAlert {
  number: number;
  state: string;
  packageName: string;
  manifestPath: string;
  severity: string;
  summary: string;
  vulnerableVersionRange: string;
  patchedVersion: string | null;
  ghsaId: string | null;
}

export interface DeliveryResult {
  method: 'direct_push' | 'pull_request' | 'no_changes';
  branch: string;
  pullRequestUrl?: string;
  lockfilesUpdated: string[];
  commitSha?: string;
}

export interface GitHubRemediationPort {
  getDefaultBranch(owner: string, repo: string): Promise<string>;
  deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
  ): Promise<void>;
  ensureGitignoreEntry(
    owner: string,
    repo: string,
    entry: string,
  ): Promise<void>;
  pinWorkflowActions(
    owner: string,
    repo: string,
    workflowPath: string,
  ): Promise<number>;
  removeMaliciousContent(
    owner: string,
    repo: string,
    path: string,
    patterns: string[],
  ): Promise<void>;
  fixDependabotAlert(
    owner: string,
    repo: string,
    alertNumber: number,
  ): Promise<void>;
  updatePackageVersion(
    owner: string,
    repo: string,
    packageName: string,
    targetVersion: string,
    manifestPath?: string,
  ): Promise<void>;
  removePackageFromManifest(
    owner: string,
    repo: string,
    packageName: string,
    manifestPath?: string,
  ): Promise<void>;
  enableDependabotSecurityUpdates(owner: string, repo: string): Promise<void>;
  listDependabotAlerts(owner: string, repo: string): Promise<DependabotAlert[]>;
  createSecurityIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
  ): Promise<void>;
}

export const GITHUB_REMEDIATION_PORT = Symbol('GITHUB_REMEDIATION_PORT');
