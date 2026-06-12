'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  pollServerJob,
  resumeRunningTasks,
  useBackgroundTasksStore,
} from '@/stores/background-tasks-store';

const POLL_INTERVAL_MS = 4000;

/** Mantém polling de jobs do servidor enquanto houver tarefas em execução. */
export function useBackgroundJobPolling(): void {
  const token = useAuthStore((s) => s.token);
  const hasRunning = useBackgroundTasksStore((s) =>
    Object.values(s.tasks).some((t) => t.status === 'running'),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token || !hasRunning) return;

    void resumeRunningTasks(token);

    intervalRef.current = setInterval(() => {
      void resumeRunningTasks(token);
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, hasRunning]);
}

export { pollServerJob };
