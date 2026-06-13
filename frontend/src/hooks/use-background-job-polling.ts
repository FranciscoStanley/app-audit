'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  rehydrateBackgroundTasksOnce,
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
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!token) return;

    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true;
      void rehydrateBackgroundTasksOnce().then(() => resumeRunningTasks(token));
    }
  }, [token]);

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
