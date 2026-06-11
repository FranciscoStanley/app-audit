'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  pollServerJob,
  resumeRunningTasks,
} from '@/stores/background-tasks-store';

const POLL_INTERVAL_MS = 2500;

/** Mantém polling de jobs do servidor enquanto o dashboard estiver montado. */
export function useBackgroundJobPolling(): void {
  const token = useAuthStore((s) => s.token);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token) return;

    void resumeRunningTasks(token);

    intervalRef.current = setInterval(() => {
      void resumeRunningTasks(token);
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token]);
}

export { pollServerJob };
