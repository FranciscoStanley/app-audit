import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveTaskOutcomeFromJob } from '@/lib/background-task-outcome';
import {
  AUDIT_TASK_ID,
  bulkRemediationTaskId,
  mergeTaskRecords,
  rehydrateBackgroundTasksOnce,
  remediationTaskId,
  selectVisibleTasks,
  syncThreatIntelInBackground,
  THREAT_INTEL_TASK_ID,
  useBackgroundTasksStore,
} from './background-tasks-store';

vi.mock('@/lib/api', () => ({
  api: {
    enqueueAuditJob: vi.fn(),
    enqueueRemediationJob: vi.fn(),
    enqueueRemediationAllJob: vi.fn(),
    getBackgroundJob: vi.fn(),
    listBackgroundJobs: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }),
    syncThreatIntel: vi.fn(),
    runAudit: vi.fn(),
    applyRemediation: vi.fn(),
    applyAllRemediation: vi.fn(),
  },
}));

describe('background-tasks-store', () => {
  beforeEach(async () => {
    useBackgroundTasksStore.setState({ tasks: {}, previewPlans: {} });
    const { api } = await import('@/lib/api');
    vi.mocked(api.getBackgroundJob).mockReset();
    vi.mocked(api.listBackgroundJobs).mockReset();
    vi.mocked(api.listBackgroundJobs).mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
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

  it('prefers in-memory running task over stale persisted state on merge', () => {
    const merged = mergeTaskRecords(
      {
        [AUDIT_TASK_ID]: {
          id: AUDIT_TASK_ID,
          type: 'audit',
          label: 'Stale',
          status: 'success',
          startedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      {
        [AUDIT_TASK_ID]: {
          id: AUDIT_TASK_ID,
          serverJobId: 'job-1',
          type: 'audit',
          label: 'Live',
          status: 'running',
          startedAt: '2026-06-01T00:00:00.000Z',
        },
      },
    );

    expect(merged[AUDIT_TASK_ID]?.status).toBe('running');
    expect(merged[AUDIT_TASK_ID]?.serverJobId).toBe('job-1');
  });

  it('exposes stable id for threat intel sync', () => {
    expect(THREAT_INTEL_TASK_ID).toBe('threat-intel-sync');
  });

  it('runs threat intel sync in background and completes task', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.syncThreatIntel).mockResolvedValue({});

    await syncThreatIntelInBackground('token');

    const task = useBackgroundTasksStore.getState().tasks[THREAT_INTEL_TASK_ID];
    expect(api.syncThreatIntel).toHaveBeenCalledWith('token');
    expect(task?.status).toBe('success');
    expect(task?.type).toBe('threat-intel-sync');
  });

  it('marks threat intel sync as error when API fails', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.syncThreatIntel).mockRejectedValue(new Error('timeout'));

    await syncThreatIntelInBackground('token');

    const task = useBackgroundTasksStore.getState().tasks[THREAT_INTEL_TASK_ID];
    expect(task?.status).toBe('error');
    expect(task?.error).toBe('timeout');
  });

  it('resumeRunningTasks consulta servidor quando não há tarefas locais', async () => {
    const { api } = await import('@/lib/api');
    const { resumeRunningTasks } = await import('./background-tasks-store');

    vi.mocked(api.listBackgroundJobs).mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        pageSize: 100,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    await resumeRunningTasks('token');

    expect(api.listBackgroundJobs).toHaveBeenCalled();
    expect(api.getBackgroundJob).not.toHaveBeenCalled();
  });

  it('resumeRunningTasks restaura auditoria ativa do servidor', async () => {
    const { api } = await import('@/lib/api');
    const { resumeRunningTasks } = await import('./background-tasks-store');

    vi.mocked(api.listBackgroundJobs).mockImplementation(async (_token, params) => ({
      data:
        params?.status === 'running'
          ? [
              {
                id: 'job-1',
                type: 'audit_run',
                status: 'running',
                label: 'Varredura',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ]
          : [],
      meta: {
        page: 1,
        pageSize: 100,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    }));

    vi.mocked(api.getBackgroundJob).mockResolvedValue({
      id: 'job-1',
      type: 'audit_run',
      status: 'running',
      label: 'Varredura',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await resumeRunningTasks('token');

    expect(useBackgroundTasksStore.getState().tasks[AUDIT_TASK_ID]?.status).toBe('running');
    expect(useBackgroundTasksStore.getState().tasks[AUDIT_TASK_ID]?.serverJobId).toBe('job-1');
  });

  it('pollServerJob mantém tarefa em execução em falha transitória de rede', async () => {
    const { api } = await import('@/lib/api');
    const { pollServerJob } = await import('./background-tasks-store');

    useBackgroundTasksStore.getState().upsertTask({
      id: AUDIT_TASK_ID,
      serverJobId: 'job-1',
      type: 'audit',
      label: 'Varredura',
      status: 'running',
      startedAt: new Date().toISOString(),
    });

    vi.mocked(api.getBackgroundJob).mockRejectedValue(new Error('network'));

    await pollServerJob('token', AUDIT_TASK_ID, 'job-1');

    expect(useBackgroundTasksStore.getState().tasks[AUDIT_TASK_ID]?.status).toBe('running');
  });

  it('warnTask marca remediação parcial sem status success', () => {
    const { upsertTask, warnTask } = useBackgroundTasksStore.getState();

    upsertTask({
      id: 'remediation-f-1',
      type: 'remediation-single',
      label: 'Remediação',
      status: 'running',
      startedAt: new Date().toISOString(),
    });

    warnTask(
      'remediation-f-1',
      {
        remediationResult: {
          success: false,
          message: 'Remediação parcial — 1 passo(s) falharam',
          appliedSteps: ['Fixar GitHub Action por SHA'],
          requiresManualSteps: ['Entrega: falhou'],
        },
      },
      'Remediação parcial — 1 passo(s) falharam',
    );

    const task = useBackgroundTasksStore.getState().tasks['remediation-f-1'];
    expect(task.status).toBe('warning');
    expect(task.status).not.toBe('success');
  });

  it('resolveTaskOutcomeFromJob diferencia parcial de sucesso', () => {
    expect(
      resolveTaskOutcomeFromJob({
        id: 'j1',
        type: 'remediation_apply',
        status: 'completed',
        label: 'x',
        createdAt: '',
        updatedAt: '',
        result: { success: true, message: 'OK' },
      }),
    ).toBe('success');

    expect(
      resolveTaskOutcomeFromJob({
        id: 'j2',
        type: 'remediation_apply',
        status: 'completed',
        label: 'x',
        createdAt: '',
        updatedAt: '',
        result: {
          success: false,
          message: 'Parcial',
          appliedSteps: ['passo'],
        },
      }),
    ).toBe('warning');
  });

  it('resumeRunningTasks polls only known server jobs without duplicate list calls', async () => {
    const { api } = await import('@/lib/api');
    const { resumeRunningTasks } = await import('./background-tasks-store');

    vi.mocked(api.listBackgroundJobs).mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        pageSize: 100,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    vi.mocked(api.getBackgroundJob).mockResolvedValue({
      id: 'job-1',
      type: 'audit_run',
      status: 'running',
      label: 'Varredura',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    useBackgroundTasksStore.getState().upsertTask({
      id: AUDIT_TASK_ID,
      serverJobId: 'job-1',
      type: 'audit',
      label: 'Varredura',
      status: 'running',
      startedAt: new Date().toISOString(),
    });

    await resumeRunningTasks('token');

    expect(api.getBackgroundJob).toHaveBeenCalledTimes(1);
    expect(api.listBackgroundJobs).not.toHaveBeenCalled();
  });
});
