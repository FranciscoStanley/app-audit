'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  api,
  type BackgroundJobResponse,
  type RemediationPlan,
  type RemediationResult,
} from '@/lib/api';

export type BackgroundTaskType =
  | 'audit'
  | 'remediation-single'
  | 'remediation-bulk'
  | 'threat-intel-sync';

export type BackgroundTaskStatus = 'running' | 'success' | 'error';

export interface BulkRemediationTaskResult {
  message: string;
  pullRequests: string[];
  succeeded: number;
  total: number;
}

export interface SingleRemediationTaskResult {
  remediationResult: RemediationResult;
}

export interface AuditTaskResult {
  auditId?: string;
}

export interface BackgroundTask {
  id: string;
  serverJobId?: string;
  type: BackgroundTaskType;
  label: string;
  status: BackgroundTaskStatus;
  error?: string;
  result?: BulkRemediationTaskResult | SingleRemediationTaskResult | AuditTaskResult;
  progress?: {
    phase: string;
    current: number;
    total: number;
    message?: string;
  };
  metadata?: {
    findingId?: string;
    auditId?: string;
    repository?: string;
  };
  startedAt: string;
  completedAt?: string;
}

interface BackgroundTasksState {
  tasks: Record<string, BackgroundTask>;
  /** Planos de remediação já carregados (preview) — sobrevivem à navegação */
  previewPlans: Record<string, RemediationPlan>;
  upsertTask: (task: BackgroundTask) => void;
  setPreviewPlan: (findingId: string, plan: RemediationPlan) => void;
  clearPreviewPlan: (findingId: string) => void;
  completeTask: (id: string, result?: BackgroundTask['result']) => void;
  failTask: (id: string, error: string) => void;
  updateProgress: (id: string, progress: BackgroundTask['progress']) => void;
  dismissTask: (id: string) => void;
  clearCompleted: () => void;
  isRunning: (id: string) => boolean;
}

const STALE_RUNNING_MS = 6 * 60 * 60 * 1000;
const activePolls = new Set<string>();

export function remediationTaskId(findingId: string): string {
  return `remediation-${findingId}`;
}

export function bulkRemediationTaskId(auditId: string): string {
  return `remediation-bulk-${auditId}`;
}

export const AUDIT_TASK_ID = 'audit-run';
export const THREAT_INTEL_TASK_ID = 'threat-intel-sync';

export function mergeTaskRecords(
  persisted: Record<string, BackgroundTask>,
  current: Record<string, BackgroundTask>,
): Record<string, BackgroundTask> {
  const ids = new Set([...Object.keys(persisted), ...Object.keys(current)]);
  const merged: Record<string, BackgroundTask> = {};

  for (const id of ids) {
    const p = persisted[id];
    const c = current[id];
    if (!p) {
      merged[id] = c!;
      continue;
    }
    if (!c) {
      merged[id] = p;
      continue;
    }

    if (c.status === 'running' && p.status !== 'running') {
      merged[id] = c;
    } else if (p.status === 'running' && c.status !== 'running') {
      merged[id] = p;
    } else if (c.serverJobId && !p.serverJobId) {
      merged[id] = c;
    } else if (Date.parse(c.startedAt) >= Date.parse(p.startedAt)) {
      merged[id] = c;
    } else {
      merged[id] = p;
    }
  }

  return merged;
}

function mapServerStatus(
  status: BackgroundJobResponse['status'],
): BackgroundTaskStatus | 'pending' {
  if (status === 'pending' || status === 'running') return 'running';
  if (status === 'completed') return 'success';
  return 'error';
}

function jobToTaskResult(
  job: BackgroundJobResponse,
): BackgroundTask['result'] | undefined {
  if (!job.result) return undefined;
  if (job.type === 'audit_run') {
    return { auditId: job.result.auditId as string | undefined };
  }
  if (job.type === 'remediation_apply') {
    return {
      remediationResult: {
        success: Boolean(job.result.success),
        message: String(job.result.message ?? ''),
        appliedSteps: (job.result.appliedSteps as string[]) ?? [],
        requiresManualSteps: (job.result.requiresManualSteps as string[]) ?? [],
        delivery: job.result.delivery as RemediationResult['delivery'],
        dependabot: job.result.dependabot as RemediationResult['dependabot'],
      },
    };
  }
  if (job.type === 'remediation_apply_all') {
    const results = (job.result.results as Array<{ pullRequestUrl?: string }>) ?? [];
    const pullRequests = results
      .map((r) => r.pullRequestUrl)
      .filter((url): url is string => Boolean(url));
    const succeeded = Number(job.result.succeeded ?? 0);
    const total = Number(job.result.total ?? 0);
    return {
      message: `${succeeded}/${total} vulnerabilidades corrigidas automaticamente`,
      pullRequests,
      succeeded,
      total,
    };
  }
  return undefined;
}

function syncTaskFromJob(taskId: string, job: BackgroundJobResponse): void {
  const store = useBackgroundTasksStore.getState();
  const mapped = mapServerStatus(job.status);
  const existing = store.tasks[taskId];
  const type = existing?.type ?? taskTypeFromJob(job.type);
  const metadata =
    existing?.metadata ??
    (job.findingId
      ? { findingId: job.findingId }
      : job.auditId
        ? { auditId: job.auditId }
        : undefined);

  if (mapped === 'running') {
    store.upsertTask({
      id: taskId,
      serverJobId: job.id,
      type,
      label: job.label || existing?.label || 'Tarefa em execução',
      status: 'running',
      progress: job.progress,
      metadata,
      startedAt: existing?.startedAt ?? job.createdAt,
    });
    return;
  }

  if (mapped === 'success') {
    if (!existing) {
      store.upsertTask({
        id: taskId,
        serverJobId: job.id,
        type,
        label: job.label,
        status: 'running',
        metadata,
        startedAt: job.createdAt,
      });
    }
    store.completeTask(taskId, jobToTaskResult(job));
    const current = useBackgroundTasksStore.getState().tasks[taskId];
    if (current) {
      useBackgroundTasksStore.getState().upsertTask({
        ...current,
        serverJobId: job.id,
        progress: job.progress,
      });
    }
    return;
  }

  if (!existing) {
    store.upsertTask({
      id: taskId,
      serverJobId: job.id,
      type,
      label: job.label,
      status: 'running',
      metadata,
      startedAt: job.createdAt,
    });
  }
  store.failTask(taskId, job.error ?? 'Falha na operação');
}

function taskTypeFromJob(type: BackgroundJobResponse['type']): BackgroundTaskType {
  if (type === 'audit_run') return 'audit';
  if (type === 'remediation_apply_all') return 'remediation-bulk';
  return 'remediation-single';
}

export async function pollServerJob(
  token: string,
  taskId: string,
  serverJobId: string,
): Promise<void> {
  const pollKey = `${taskId}:${serverJobId}`;
  if (activePolls.has(pollKey)) return;
  activePolls.add(pollKey);

  try {
    const job = await api.getBackgroundJob(token, serverJobId);
    syncTaskFromJob(taskId, job);
  } catch (e) {
    useBackgroundTasksStore.getState().failTask(
      taskId,
      e instanceof Error ? e.message : 'Falha ao consultar status do job',
    );
  } finally {
    activePolls.delete(pollKey);
  }
}

export async function resumeRunningTasks(token: string): Promise<void> {
  const { tasks } = useBackgroundTasksStore.getState();
  const running = Object.values(tasks).filter((t) => t.status === 'running');

  for (const task of running) {
    if (task.serverJobId) {
      await pollServerJob(token, task.id, task.serverJobId);
    }
  }

  const serverJobs = [
    ...(await api.listBackgroundJobs(token, { status: 'running', pageSize: 100 })).data,
    ...(await api.listBackgroundJobs(token, { status: 'pending', pageSize: 100 })).data,
  ];

  for (const job of serverJobs) {
    const taskId = resolveTaskIdFromJob(job);
    if (!taskId) continue;
    syncTaskFromJob(taskId, job);
    if (job.status === 'pending' || job.status === 'running') {
      await pollServerJob(token, taskId, job.id);
    }
  }
}

function resolveTaskIdFromJob(job: BackgroundJobResponse): string | null {
  if (job.type === 'audit_run') return AUDIT_TASK_ID;
  if (job.type === 'remediation_apply_all' && job.auditId) {
    return bulkRemediationTaskId(job.auditId);
  }
  if (job.type === 'remediation_apply' && job.findingId) {
    return remediationTaskId(job.findingId);
  }
  const existing = Object.values(useBackgroundTasksStore.getState().tasks).find(
    (t) => t.serverJobId === job.id,
  );
  return existing?.id ?? null;
}

function normalizeStaleRunningTasks(tasks: Record<string, BackgroundTask>): Record<string, BackgroundTask> {
  const now = Date.now();
  const next: Record<string, BackgroundTask> = {};

  for (const [id, task] of Object.entries(tasks)) {
    if (task.status !== 'running') {
      next[id] = task;
      continue;
    }
    const started = Date.parse(task.startedAt);
    if (Number.isNaN(started) || now - started > STALE_RUNNING_MS) {
      next[id] = {
        ...task,
        status: 'error',
        error: 'Tarefa expirada localmente — consulte o histórico de jobs no servidor.',
        completedAt: new Date().toISOString(),
      };
    } else {
      next[id] = task;
    }
  }

  return next;
}

export const useBackgroundTasksStore = create<BackgroundTasksState>()(
  persist(
    (set, get) => ({
      tasks: {},
      previewPlans: {},
      upsertTask: (task) =>
        set((state) => ({
          tasks: { ...state.tasks, [task.id]: task },
        })),
      setPreviewPlan: (findingId, plan) =>
        set((state) => ({
          previewPlans: { ...state.previewPlans, [findingId]: plan },
        })),
      clearPreviewPlan: (findingId) =>
        set((state) => {
          const next = { ...state.previewPlans };
          delete next[findingId];
          return { previewPlans: next };
        }),
      completeTask: (id, result) =>
        set((state) => {
          const current = state.tasks[id];
          if (!current) return state;
          return {
            tasks: {
              ...state.tasks,
              [id]: {
                ...current,
                status: 'success',
                result,
                error: undefined,
                completedAt: new Date().toISOString(),
              },
            },
          };
        }),
      failTask: (id, error) =>
        set((state) => {
          const current = state.tasks[id];
          if (!current) return state;
          return {
            tasks: {
              ...state.tasks,
              [id]: {
                ...current,
                status: 'error',
                error,
                completedAt: new Date().toISOString(),
              },
            },
          };
        }),
      updateProgress: (id, progress) =>
        set((state) => {
          const current = state.tasks[id];
          if (!current) return state;
          return {
            tasks: {
              ...state.tasks,
              [id]: { ...current, progress },
            },
          };
        }),
      dismissTask: (id) =>
        set((state) => {
          const next = { ...state.tasks };
          delete next[id];
          return { tasks: next };
        }),
      clearCompleted: () =>
        set((state) => ({
          tasks: Object.fromEntries(
            Object.entries(state.tasks).filter(([, task]) => task.status === 'running'),
          ),
        })),
      isRunning: (id) => get().tasks[id]?.status === 'running',
    }),
    {
      name: 'app-audit-background-tasks',
      skipHydration: true,
      partialize: (state) => ({ tasks: state.tasks, previewPlans: state.previewPlans }),
      merge: (persisted, current) => {
        const p = persisted as Partial<Pick<BackgroundTasksState, 'tasks' | 'previewPlans'>>;
        return {
          ...current,
          tasks: normalizeStaleRunningTasks(
            mergeTaskRecords(p.tasks ?? {}, current.tasks ?? {}),
          ),
          previewPlans: { ...current.previewPlans, ...p.previewPlans },
        };
      },
    },
  ),
);

let backgroundTasksRehydratePromise: Promise<void> | null = null;

/** Reidrata o persist uma única vez por sessão do app. */
export function rehydrateBackgroundTasksOnce(): Promise<void> {
  if (!backgroundTasksRehydratePromise) {
    backgroundTasksRehydratePromise = Promise.resolve(
      useBackgroundTasksStore.persist.rehydrate(),
    ).then(() => undefined);
  }
  return backgroundTasksRehydratePromise;
}

export function useBackgroundTasksHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void rehydrateBackgroundTasksOnce().finally(() => setHydrated(true));
  }, []);

  return hydrated;
}

export async function runAuditInBackground(token: string): Promise<void> {
  const store = useBackgroundTasksStore.getState();
  if (store.isRunning(AUDIT_TASK_ID)) return;

  store.upsertTask({
    id: AUDIT_TASK_ID,
    type: 'audit',
    label: 'Varredura de vulnerabilidades',
    status: 'running',
    startedAt: new Date().toISOString(),
  });

  try {
    const { jobId } = await api.enqueueAuditJob(token);
    store.upsertTask({
      ...store.tasks[AUDIT_TASK_ID]!,
      serverJobId: jobId,
    });
    await pollServerJob(token, AUDIT_TASK_ID, jobId);
  } catch (e) {
    useBackgroundTasksStore.getState().failTask(
      AUDIT_TASK_ID,
      e instanceof Error ? e.message : 'Falha ao enfileirar auditoria',
    );
  }
}

export async function applyRemediationInBackground(
  token: string,
  findingId: string,
  label: string,
  repository?: string,
): Promise<void> {
  const taskId = remediationTaskId(findingId);
  const store = useBackgroundTasksStore.getState();
  if (store.isRunning(taskId)) return;

  store.upsertTask({
    id: taskId,
    type: 'remediation-single',
    label,
    status: 'running',
    metadata: { findingId, repository },
    startedAt: new Date().toISOString(),
    error: undefined,
    result: undefined,
    completedAt: undefined,
  });

  try {
    const { jobId } = await api.enqueueRemediationJob(token, findingId);
    store.upsertTask({
      ...useBackgroundTasksStore.getState().tasks[taskId]!,
      serverJobId: jobId,
    });
    await pollServerJob(token, taskId, jobId);
  } catch (e) {
    useBackgroundTasksStore.getState().failTask(
      taskId,
      e instanceof Error ? e.message : 'Falha ao enfileirar remediação',
    );
  }
}

export async function applyAllRemediationInBackground(
  token: string,
  auditId: string,
  count: number,
): Promise<void> {
  const taskId = bulkRemediationTaskId(auditId);
  const store = useBackgroundTasksStore.getState();
  if (store.isRunning(taskId)) return;

  store.upsertTask({
    id: taskId,
    type: 'remediation-bulk',
    label: `Remediação em lote (${count} vulnerabilidades)`,
    status: 'running',
    metadata: { auditId },
    startedAt: new Date().toISOString(),
  });

  try {
    const { jobId } = await api.enqueueRemediationAllJob(token, auditId);
    store.upsertTask({
      ...useBackgroundTasksStore.getState().tasks[taskId]!,
      serverJobId: jobId,
    });
    await pollServerJob(token, taskId, jobId);
  } catch (e) {
    useBackgroundTasksStore.getState().failTask(
      taskId,
      e instanceof Error ? e.message : 'Falha ao enfileirar remediação em lote',
    );
  }
}

export async function syncThreatIntelInBackground(token: string): Promise<void> {
  const store = useBackgroundTasksStore.getState();
  if (store.isRunning(THREAT_INTEL_TASK_ID)) return;

  store.upsertTask({
    id: THREAT_INTEL_TASK_ID,
    type: 'threat-intel-sync',
    label: 'Sincronização Threat Intelligence',
    status: 'running',
    startedAt: new Date().toISOString(),
    error: undefined,
    result: undefined,
    completedAt: undefined,
  });

  try {
    await api.syncThreatIntel(token);
    useBackgroundTasksStore.getState().completeTask(THREAT_INTEL_TASK_ID);
  } catch (e) {
    useBackgroundTasksStore.getState().failTask(
      THREAT_INTEL_TASK_ID,
      e instanceof Error ? e.message : 'Falha na sincronização',
    );
  }
}

export function selectVisibleTasks(tasks: Record<string, BackgroundTask>): BackgroundTask[] {
  return Object.values(tasks).sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
  );
}
