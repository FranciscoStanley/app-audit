export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ThreatFindingType =
  | 'malicious_file'
  | 'malicious_pattern'
  | 'compromised_dependency'
  | 'compromised_action'
  | 'cloned_affected_repo'
  | 'exposed_secret'
  | 'unpinned_action'
  | 'vulnerable_dependency'
  | 'suspicious_config'
  | 'c2_domain'
  | 'malware_advisory';

export interface ThreatFinding {
  id: string;
  type: ThreatFindingType;
  severity: ThreatSeverity;
  message: string;
  evidence?: string;
  category: string;
  remediationAvailable: boolean;
}

export interface RepositoryScan {
  name: string;
  fullName: string;
  isPrivate: boolean;
  url: string;
  language: string | null;
  topics: string[];
  updatedAt: string;
  findings: ThreatFinding[];
  isAffected: boolean;
  vulnerabilityCount: number;
}
