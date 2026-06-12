import type { DeliveryResult } from '../../domain/ports/github-remediation.port';

export type RemediationAction =
  | 'remove_file'
  | 'update_dependency'
  | 'pin_github_action'
  | 'rotate_secret'
  | 'enable_branch_protection'
  | 'manual_review';

export type RemediationStepAction =
  | 'delete_file'
  | 'gitignore'
  | 'pin_actions'
  | 'fix_dependabot'
  | 'enable_dependabot'
  | 'update_dependency'
  | 'remove_dependency'
  | 'regenerate_lockfile'
  | 'sanitize_workflow'
  | 'security_issue';

export interface RemediationStep {
  order: number;
  title: string;
  description: string;
  action?: RemediationStepAction;
  command?: string;
  automated: boolean;
}

export interface RemediationPlan {
  findingId: string;
  repository: string;
  action: RemediationAction;
  steps: RemediationStep[];
  canAutoApply: boolean;
  estimatedImpact: 'low' | 'medium' | 'high';
}

export interface RemediationResult {
  success: boolean;
  message: string;
  appliedSteps: string[];
  requiresManualSteps: string[];
  delivery?: DeliveryResult;
  /** Sincronização com alertas Dependabot no GitHub (Security → Vulnerabilities) */
  dependabot?: {
    targetedAlertNumbers: number[];
    closedAlertNumbers: number[];
    stillOpenAlertNumbers: number[];
  };
}
