'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function ThreatIntelPage() {
  const token = useAuthStore((s) => s.token);
  const canSync = useAuthStore((s) => s.can('threat-intel:sync'));
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    if (!token) return;
    setStatus((await api.threatIntelStatus(token)) as Record<string, unknown>);
  }

  useEffect(() => { load(); }, [token]);

  async function sync() {
    if (!token) return;
    setSyncing(true);
    try {
      await api.syncThreatIntel(token);
      await load();
    } finally {
      setSyncing(false);
    }
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
