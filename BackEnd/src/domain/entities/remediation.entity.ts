export type RemediationAction =
  | 'remove_file'
  | 'update_dependency'
  | 'pin_github_action'
  | 'rotate_secret'
  | 'enable_branch_protection'
  | 'manual_review';

export interface RemediationStep {
  order: number;
  title: string;
  description: string;
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
}
