import type {
  CompromisedPackage,
  CompromisedRepository,
  OsmCheckResult,
  ThreatEcosystem,
  ThreatIntelSyncResult,
} from '../entities/threat-intelligence.entity';

export interface GitHubAdvisoryRecord {
  ghsaId: string;
  cveId: string | null;
  summary: string;
  description: string | null;
  severity: string;
  type: string;
  publishedAt: string;
  updatedAt: string;
  htmlUrl: string;
  packages: Array<{
    ecosystem: string;
    name: string | null;
    vulnerableVersionRange: string | null;
  }>;
}

export interface GitHubAdvisoryPort {
  fetchMalwareAdvisories(since?: string): Promise<GitHubAdvisoryRecord[]>;
}

export interface OpenSourceMalwarePort {
  checkMalicious(params: {
    reportType: 'package' | 'repository' | 'domain' | 'url';
    resourceIdentifier: string;
    ecosystem?: string;
    version?: string;
  }): Promise<OsmCheckResult>;

  fetchLatestThreats?(): Promise<CompromisedPackage[]>;
}

export interface ThreatIntelligenceStorePort {
  getPackages(): CompromisedPackage[];
  getRepositories(): CompromisedRepository[];
  getMaliciousFiles(): Array<{ path: string; description: string }>;
  getCompromisedActions(): string[];
  getC2Domains(): string[];
  isPackageCompromised(
    name: string,
    ecosystem: ThreatEcosystem,
    version?: string,
  ): CompromisedPackage | null;
  isRepositoryCompromised(fullName: string): CompromisedRepository | null;
  getStatus(): import('../entities/threat-intelligence.entity').ThreatIntelStatus;
  applySync(
    packages: CompromisedPackage[],
    repositories: CompromisedRepository[],
  ): void;
}

export const GITHUB_ADVISORY_PORT = Symbol('GITHUB_ADVISORY_PORT');
export const OPEN_SOURCE_MALWARE_PORT = Symbol('OPEN_SOURCE_MALWARE_PORT');
export const THREAT_INTELLIGENCE_STORE_PORT = Symbol(
  'THREAT_INTELLIGENCE_STORE_PORT',
);

export interface SyncThreatIntelligencePort {
  execute(): Promise<ThreatIntelSyncResult>;
}

export const SYNC_THREAT_INTELLIGENCE = Symbol('SYNC_THREAT_INTELLIGENCE');
