'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import {
  type BackgroundTask,
  selectVisibleTasks,
  useBackgroundTasksStore,
} from '@/stores/background-tasks-store';

function taskHref(type: BackgroundTask['type']): string {
  if (type === 'audit') return '/dashboard/audits';
  if (type === 'threat-intel-sync') return '/dashboard/threat-intel';
  return '/dashboard/vulnerabilities';
}

/** Banner compacto apenas para tarefas em execução — conclusão via toast. */
export function BackgroundTasksBanner() {
  const tasks = useBackgroundTasksStore((s) => s.tasks);
  const running = selectVisibleTasks(tasks).filter((t) => t.status === 'running');

  if (running.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {running.map((task) => (
        <div
          key={task.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
        >
          <div className="flex items-center gap-3 text-sm text-amber-100">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <div>
              <p className="font-medium">{task.label}</p>
              <p className="text-amber-200/70">
                Em execução em segundo plano — você pode navegar livremente.
                {task.progress && task.progress.total > 0 && (
                  <span className="ml-1">
                    ({task.progress.current}/{task.progress.total}
                    {task.progress.message ? ` · ${task.progress.message}` : ''})
                  </span>
                )}
              </p>
            </div>
          </div>
          <Link href={taskHref(task.type)} className="text-xs text-amber-200 underline">
            Ver detalhes
          </Link>
        </div>
      ))}
    </div>
  );
}
