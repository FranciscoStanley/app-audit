'use client';

import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import {
  type BackgroundTask,
  selectVisibleTasks,
  useBackgroundTasksHydrated,
  useBackgroundTasksStore,
} from '@/stores/background-tasks-store';
import { Button } from '@/components/ui/button';

function taskHref(type: BackgroundTask['type']): string {
  if (type === 'audit') return '/dashboard/audits';
  return '/dashboard/vulnerabilities';
}

export function BackgroundTasksBanner() {
  const hydrated = useBackgroundTasksHydrated();
  const tasks = useBackgroundTasksStore((s) => s.tasks);
  const dismissTask = useBackgroundTasksStore((s) => s.dismissTask);
  const clearCompleted = useBackgroundTasksStore((s) => s.clearCompleted);

  if (!hydrated) return null;

  const visible = selectVisibleTasks(tasks);
  if (visible.length === 0) return null;

  const running = visible.filter((t) => t.status === 'running');
  const finished = visible.filter((t) => t.status !== 'running');

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

      {finished.map((task) => (
        <div
          key={task.id}
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
            task.status === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}
        >
          <div className="flex items-start gap-3 text-sm">
            {task.status === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            )}
            <div>
              <p className={`font-medium ${task.status === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>
                {task.label}
              </p>
              {task.status === 'success' && task.type === 'audit' && (
                <p className="text-emerald-200/80">Varredura concluída.</p>
              )}
              {task.status === 'success' && task.type === 'remediation-bulk' && task.result && 'message' in task.result && (
                <p className="text-emerald-200/80">{task.result.message}</p>
              )}
              {task.status === 'success' && task.type === 'remediation-single' && task.result && 'remediationResult' in task.result && (
                <p className="text-emerald-200/80">{task.result.remediationResult.message}</p>
              )}
              {task.status === 'error' && (
                <p className="text-red-200/80">{task.error ?? 'Falha na operação'}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={taskHref(task.type)} className="text-xs underline opacity-80">
              Abrir
            </Link>
            <Button variant="ghost" onClick={() => dismissTask(task.id)} aria-label="Dispensar">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      {finished.length > 1 && (
        <button
          type="button"
          onClick={clearCompleted}
          className="text-xs text-slate-500 underline hover:text-slate-300"
        >
          Limpar concluídas
        </button>
      )}
    </div>
  );
}
