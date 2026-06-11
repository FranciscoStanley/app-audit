export type BackgroundJobType =
  | 'audit_run'
  | 'remediation_apply'
  | 'remediation_apply_all';

export type BackgroundJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export interface BackgroundJobProgress {
  phase: string;
  current: number;
  total: number;
  message?: string;
}

export interface BackgroundJobPayload {
  saveReport?: boolean;
  findingId?: string;
  auditId?: string;
}

export interface BackgroundJob {
  id: string;
  type: BackgroundJobType;
  userId: string;
  status: BackgroundJobStatus;
  label: string;
  progress?: BackgroundJobProgress;
  payload: BackgroundJobPayload;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}
