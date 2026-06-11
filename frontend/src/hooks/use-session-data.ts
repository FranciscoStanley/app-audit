'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type AuditReport, type GitHubStatus } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export interface ThreatIntelStatus {
  lastSyncedAt: string | null;
  totalPackages: number;
  totalRepositories: number;
  githubAdvisoryEnabled?: boolean;
  openSourceMalwareEnabled?: boolean;
}

export function useSessionData() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const [github, setGithub] = useState<GitHubStatus | null>(null);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelStatus | null>(null);
  const [latestReport, setLatestReport] = useState<{ id: string; report: AuditReport } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [me, status, reports, intel] = await Promise.all([
        api.me(token),
        api.githubStatus(token).catch(() => null),
        api.listReports(token).catch(() => []),
        api.threatIntelStatus(token).catch(() => null),
      ]);

      setUser(me);
      if (status) setGithub(status);
      if (intel) setThreatIntel(intel as ThreatIntelStatus);

      const first = reports[0] as { id: string; report: AuditReport } | undefined;
      setLatestReport(first ? { id: first.id, report: first.report } : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados da sessão');
    } finally {
      setLoading(false);
    }
  }, [token, setUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { github, threatIntel, latestReport, loading, error, refresh };
}
