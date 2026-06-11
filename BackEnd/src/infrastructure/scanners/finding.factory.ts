import { randomUUID } from 'node:crypto';
import { ThreatFinding, ThreatFindingType, ThreatSeverity } from '../../domain/entities/repository-scan.entity';

const REMEDIATION_TYPES: ThreatFindingType[] = [
  'malicious_file',
  'malicious_pattern',
  'compromised_dependency',
  'compromised_action',
  'exposed_secret',
  'unpinned_action',
  'c2_domain',
  'vulnerable_dependency',
  'malware_advisory',
];

export function createFinding(params: {
  type: ThreatFindingType;
  severity: ThreatSeverity;
  message: string;
  evidence?: string;
  category: string;
}): ThreatFinding {
  return {
    id: randomUUID(),
    type: params.type,
    severity: params.severity,
    message: params.message,
    evidence: params.evidence,
    category: params.category,
    remediationAvailable: REMEDIATION_TYPES.includes(params.type),
  };
}
