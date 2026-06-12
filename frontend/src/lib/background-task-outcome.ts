import type { BackgroundJobResponse } from '@/lib/api';
import type { BackgroundTask, BackgroundTaskStatus } from '@/stores/background-tasks-store';

export type TaskOutcome = 'success' | 'warning' | 'error';

export function resolveTaskOutcomeFromJob(job: BackgroundJobResponse): TaskOutcome {
  if (job.status === 'failed') return 'error';

  if (job.type === 'remediation_apply') {
    const success = Boolean(job.result?.success);
    const applied =
      ((job.result?.appliedSteps as string[] | undefined) ?? []).length;
    if (success) return 'success';
    if (applied > 0) return 'warning';
    return 'error';
  }

  if (job.type === 'remediation_apply_all') {
    const failed = Number(job.result?.failed ?? 0);
    const succeeded = Number(job.result?.succeeded ?? 0);
    if (failed > 0 && succeeded > 0) return 'warning';
    if (failed > 0) return 'error';
    return 'success';
  }

  return 'success';
}

export function completionMessageForTask(task: BackgroundTask): string {
  if (task.status === 'error') {
    return task.error ?? 'Falha na operação';
  }

  if (task.type === 'audit') {
    return 'Varredura concluída.';
  }

  if (task.type === 'threat-intel-sync') {
    return 'Threat Intelligence sincronizada.';
  }

  if (task.type === 'remediation-bulk' && task.result && 'message' in task.result) {
    return task.result.message;
  }

  if (
    task.type === 'remediation-single' &&
    task.result &&
    'remediationResult' in task.result
  ) {
    return task.result.remediationResult.message;
  }

  return 'Operação concluída.';
}

export function isTerminalStatus(status: BackgroundTaskStatus): boolean {
  return status === 'success' || status === 'warning' || status === 'error';
}
