import { RepositoryScan } from './repository-scan.entity';

export interface TechnologySummary {
  name: string;
  repositoryCount: number;
  affectedCount: number;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface ImmediateAction {
  priority: number;
  title: string;
  description: string;
  category:
    | 'credential_rotation'
    | 'dependency_audit'
    | 'workflow_review'
    | 'prevention'
    | 'monitoring';
}

export interface ThreatIntelSummary {
  lastSyncedAt: string | null;
  totalPackages: number;
  totalRepositories: number;
  githubAdvisoryEnabled: boolean;
  openSourceMalwareEnabled: boolean;
}

export interface AuditReport {
  auditedAt: string;
  githubUsername: string;
  totalRepositories: number;
  publicRepositories: number;
  privateRepositories: number;
  allRepositories: RepositoryScan[];
  affectedRepositories: RepositoryScan[];
  cleanRepositories: number;
  totalVulnerabilities: number;
  technologies: TechnologySummary[];
  immediateActions: ImmediateAction[];
  sourceReference: string;
  verdict: 'affected' | 'not_affected' | 'inconclusive';
  limitations: string[];
  threatIntel: ThreatIntelSummary;
}
