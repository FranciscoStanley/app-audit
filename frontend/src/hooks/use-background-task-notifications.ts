'use client';

import { useEffect, useRef } from 'react';
import {
  completionMessageForTask,
  isTerminalStatus,
} from '@/lib/background-task-outcome';
import { notificationService } from '@/services/notification.service';
import {
  type BackgroundTask,
  useBackgroundTasksStore,
} from '@/stores/background-tasks-store';

function toastBody(task: BackgroundTask): string {
  const detail = completionMessageForTask(task);
  return detail === task.label ? detail : `${task.label}\n${detail}`;
}

/** Sincroniza tarefas em background com toasts (react-toastify). */
export function useBackgroundTaskNotifications(): void {
  const tasks = useBackgroundTasksStore((s) => s.tasks);
  const tracked = useRef(new Set<string>());
  const primed = useRef(false);

  useEffect(() => {
    if (!primed.current) {
      for (const task of Object.values(tasks)) {
        if (task.status === 'running') {
          tracked.current.add(`${task.id}:running`);
          notificationService.loading(task.label, { toastId: task.id });
        } else if (isTerminalStatus(task.status) && task.completedAt) {
          tracked.current.add(`${task.id}:${task.status}:${task.completedAt}`);
        }
      }
      primed.current = true;
      return;
    }

    for (const task of Object.values(tasks)) {
      if (task.status === 'running') {
        const key = `${task.id}:running`;
        if (tracked.current.has(key)) continue;
        tracked.current.add(key);
        notificationService.loading(task.label, { toastId: task.id });
        continue;
      }

      if (!isTerminalStatus(task.status) || !task.completedAt) continue;

      const key = `${task.id}:${task.status}:${task.completedAt}`;
      if (tracked.current.has(key)) continue;
      tracked.current.add(key);

      const body = toastBody(task);

      if (task.status === 'success') {
        notificationService.updateSuccess(task.id, body);
      } else if (task.status === 'warning') {
        notificationService.updateWarning(task.id, body);
      } else {
        notificationService.updateError(task.id, body);
      }
    }
  }, [tasks]);
}
