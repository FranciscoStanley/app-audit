export type ThreatEcosystem =
  | 'npm'
  | 'pip'
  | 'maven'
  | 'nuget'
  | 'composer'
  | 'go'
  | 'rust'
  | 'actions'
  | 'rubygems'
  | 'other';

export interface CompromisedPackage {
  name: string;
  ecosystem: ThreatEcosystem;
  versionRange?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  source: 'github_advisory' | 'opensource_malware' | 'baseline';
  ghsaId?: string;
  cveId?: string;
  summary?: string;
  referenceUrl?: string;
  publishedAt?: string;
}

export interface CompromisedRepository {
  fullName: string;
  url: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: 'github_advisory' | 'opensource_malware' | 'baseline';
  summary?: string;
}

export interface MaliciousFileIndicator {
  path: string;
  description: string;
  pattern?: RegExp;
}

export interface ThreatIntelSyncResult {
  syncedAt: string;
  githubAdvisoriesCount: number;
  osmLatestCount: number;
  totalPackages: number;
  totalRepositories: number;
  sources: string[];
  errors: string[];
}

export interface ThreatIntelStatus {
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  totalPackages: number;
  totalRepositories: number;
  githubAdvisoryEnabled: boolean;
  openSourceMalwareEnabled: boolean;
  refreshIntervalHours: number;
}

export interface OsmCheckResult {
  malicious: boolean;
  reportType: string;
  resourceIdentifier: string;
  ecosystem?: string;
  version?: string;
  osmUrl?: string;
  severity?: string;
  description?: string;
}
