'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import {
  syncThreatIntelInBackground,
  THREAT_INTEL_TASK_ID,
  useBackgroundTasksStore,
} from '@/stores/background-tasks-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function ThreatIntelPage() {
  const token = useAuthStore((s) => s.token);
  const canSync = useAuthStore((s) => s.can('threat-intel:sync'));
  const syncTask = useBackgroundTasksStore((s) => s.tasks[THREAT_INTEL_TASK_ID]);
  const syncing = syncTask?.status === 'running';
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus((await api.threatIntelStatus(token)) as Record<string, unknown>);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (syncTask?.status === 'success') {
      void load();
    }
  }, [syncTask?.status, load]);

  function sync() {
    if (!token || syncing) return;
    void syncThreatIntelInBackground(token);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Threat Intelligence</h1>
          <p className="text-slate-400">GitHub Advisories + OpenSourceMalware</p>
        </div>
        {canSync && (
          <Button onClick={sync} loading={syncing}>
            <RefreshCw className="h-4 w-4" />
            Sincronizar
          </Button>
        )}
      </div>

      {syncing && (
        <p className="text-sm text-amber-400">
          Sincronização em andamento — você pode navegar livremente; o progresso aparece no banner superior.
        </p>
      )}

      {syncTask?.status === 'error' && (
        <p className="text-sm text-red-400">{syncTask.error ?? 'Falha na sincronização'}</p>
      )}

      {status && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><h3 className="font-semibold text-white">Status</h3></CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-400">
              <p>Última sync: {status.lastSyncedAt ? formatDate(String(status.lastSyncedAt)) : 'N/A'}</p>
              <p>Pacotes: {String(status.totalPackages)}</p>
              <p>Repositórios baseline: {String(status.totalRepositories)}</p>
              <p>GitHub Advisories: {status.githubAdvisoryEnabled ? '✅' : '❌'}</p>
              <p>OpenSourceMalware: {status.openSourceMalwareEnabled ? '✅' : '⚠️ Token ausente'}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
