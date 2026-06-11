'use client';

import { useEffect, useState } from 'react';
import { Activity, ShieldCheck, AlertTriangle, GitBranch } from 'lucide-react';
import { api, type AuditReport } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);
  const [latest, setLatest] = useState<{ id: string; report: AuditReport } | null>(null);

  useEffect(() => {
    if (!token) return;
    api.listReports(token).then((reports) => {
      if (reports[0]) setLatest({ id: reports[0].id, report: reports[0].report as AuditReport });
    });
  }, [token]);

  const stats = [
    { label: 'Repositórios', value: latest?.report.totalRepositories ?? '—', icon: GitBranch },
    { label: 'Vulnerabilidades', value: latest?.report.totalVulnerabilities ?? '—', icon: AlertTriangle },
    { label: 'Pacotes monitorados', value: latest?.report.threatIntel?.totalPackages ?? '—', icon: ShieldCheck },
    { label: 'Veredito', value: latest?.report.verdict ?? '—', icon: Activity },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Visão geral da segurança dos seus repositórios GitHub</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4">
              <div className="rounded-xl bg-violet-600/15 p-3 text-violet-400">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-semibold text-white capitalize">{String(value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {latest && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Última auditoria</h2>
              <Badge variant={latest.report.verdict === 'not_affected' ? 'success' : 'critical'}>
                {latest.report.verdict}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            <p>@{latest.report.githubUsername} · {formatDate(latest.report.auditedAt)}</p>
            <p className="mt-2">
              {latest.report.publicRepositories} públicos · {latest.report.privateRepositories} privados ·{' '}
              {latest.report.totalVulnerabilities} vulnerabilidades
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
