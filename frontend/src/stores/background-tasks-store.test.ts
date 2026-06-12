import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUDIT_TASK_ID,
  bulkRemediationTaskId,
  remediationTaskId,
  selectVisibleTasks,
  useBackgroundTasksStore,
} from './background-tasks-store';

vi.mock('@/lib/api', () => ({
  api: {
    enqueueAuditJob: vi.fn(),
    enqueueRemediationJob: vi.fn(),
    enqueueRemediationAllJob: vi.fn(),
    getBackgroundJob: vi.fn(),
    listBackgroundJobs: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }),
    runAudit: vi.fn(),
    applyRemediation: vi.fn(),
    applyAllRemediation: vi.fn(),
  },
}));

describe('background-tasks-store', () => {
  beforeEach(() => {
    useBackgroundTasksStore.setState({ tasks: {}, previewPlans: {} });
  });

  it('tracks running and completed audit task', () => {
    const { upsertTask, completeTask, isRunning } = useBackgroundTasksStore.getState();

    upsertTask({
      id: AUDIT_TASK_ID,
      type: 'audit',
      label: 'Varredura',
      status: 'running',
      startedAt: new Date().toISOString(),
    });

    expect(isRunning(AUDIT_TASK_ID)).toBe(true);

    completeTask(AUDIT_TASK_ID, { auditId: 'abc' });

    const task = useBackgroundTasksStore.getState().tasks[AUDIT_TASK_ID];
    expect(task.status).toBe('success');
    expect(task.result).toEqual({ auditId: 'abc' });
    expect(isRunning(AUDIT_TASK_ID)).toBe(false);
  });

  it('builds stable ids for remediation tasks', () => {
    expect(remediationTaskId('finding-1')).toBe('remediation-finding-1');
    expect(bulkRemediationTaskId('audit-1')).toBe('remediation-bulk-audit-1');
  });

  it('orders visible tasks by most recent first', () => {
    const { upsertTask } = useBackgroundTasksStore.getState();
    upsertTask({
      id: 'old',
      type: 'audit',
      label: 'Old',
      status: 'success',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:01:00.000Z',
    });
    upsertTask({
      id: 'new',
      type: 'audit',
      label: 'New',
      status: 'running',
      startedAt: '2026-06-01T00:00:00.000Z',
    });

    const visible = selectVisibleTasks(useBackgroundTasksStore.getState().tasks);
    expect(visible[0]?.id).toBe('new');
  });

  it('stores server job id on running task', () => {
    const { upsertTask } = useBackgroundTasksStore.getState();
    upsertTask({
      id: AUDIT_TASK_ID,
      serverJobId: 'server-job-1',
      type: 'audit',
      label: 'Varredura',
      status: 'running',
      startedAt: new Date().toISOString(),
    });

    expect(useBackgroundTasksStore.getState().tasks[AUDIT_TASK_ID]?.serverJobId).toBe(
      'server-job-1',
    );
  });

  it('stores remediation preview plans by finding id', () => {
    const { setPreviewPlan } = useBackgroundTasksStore.getState();
    setPreviewPlan('finding-1', {
      findingId: 'finding-1',
      repository: 'owner/repo',
      canAutoApply: true,
      steps: [
        {
          order: 1,
          title: 'Remover pacote',
          description: 'axios',
          automated: true,
        },
      ],
    });

    expect(useBackgroundTasksStore.getState().previewPlans['finding-1']?.steps).toHaveLength(1);
  });

  it('dismisses completed tasks', () => {
    const { upsertTask, dismissTask } = useBackgroundTasksStore.getState();
    upsertTask({
      id: 'done',
      type: 'audit',
      label: 'Done',
      status: 'success',
      startedAt: new Date().toISOString(),
    });

    dismissTask('done');
    expect(useBackgroundTasksStore.getState().tasks.done).toBeUndefined();
  });
});
