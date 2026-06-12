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
        api.listReports(token, { page: 1, pageSize: 1 }).catch(() => ({ data: [], meta: null })),
        api.threatIntelStatus(token).catch(() => null),
      ]);

      setUser(me);
      if (status) setGithub(status);
      if (intel) setThreatIntel(intel as ThreatIntelStatus);

      const first = reports.data[0];
      if (first) {
        const full = await api.getReport(token, first.id);
        setLatestReport({ id: first.id, report: full.report });
      } else {
        setLatestReport(null);
      }
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
