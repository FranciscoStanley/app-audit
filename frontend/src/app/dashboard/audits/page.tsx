'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default function AuditsPage() {
  const token = useAuthStore((s) => s.token);
  const canRun = useAuthStore((s) => s.can('audit:run'));
  const [reports, setReports] = useState<Array<{ id: string; createdAt: string; report: { verdict: string; githubUsername: string; totalVulnerabilities: number } }>>([]);
  const [running, setRunning] = useState(false);

  async function load() {
    if (!token) return;
    const data = await api.listReports(token);
    setReports(data as typeof reports);
  }

  useEffect(() => { load(); }, [token]);

  async function runAudit() {
    if (!token) return;
    setRunning(true);
    try {
      await api.runAudit(token);
      await load();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Auditorias</h1>
          <p className="text-slate-400">Histórico e execução de varreduras de segurança</p>
        </div>
        {canRun && (
          <Button onClick={runAudit} loading={running}>
            <Play className="h-4 w-4" />
            Nova auditoria
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {reports.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-white">@{r.report.githubUsername}</p>
                <p className="text-sm text-slate-500">{formatDate(r.createdAt)} · {r.report.totalVulnerabilities} vulnerabilidades</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={r.report.verdict === 'not_affected' ? 'success' : 'critical'}>{r.report.verdict}</Badge>
                <Link href={`/dashboard/audits/${r.id}`}>
                  <Button variant="secondary">
                    <ExternalLink className="h-4 w-4" />
                    Detalhes
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {reports.length === 0 && (
          <Card>
            <CardHeader>
              <p className="text-slate-400">Nenhuma auditoria executada ainda.</p>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
