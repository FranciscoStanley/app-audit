'use client';

import Link from 'next/link';
import { Activity, ShieldCheck, AlertTriangle, GitBranch, Play } from 'lucide-react';
import { GitHubIcon } from '@/components/icons/github-icon';
import { useSessionData } from '@/hooks/use-session-data';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const canRun = useAuthStore((s) => s.can('audit:run'));
  const { github, threatIntel, latestReport, loading, error } = useSessionData();

  const githubUsername = github?.githubUsername ?? user?.githubUsername ?? null;
  const hasAudit = Boolean(latestReport);

  const stats = [
    {
      label: 'Repositórios',
      value: hasAudit ? latestReport!.report.totalRepositories : '—',
      icon: GitBranch,
    },
    {
      label: 'Vulnerabilidades',
      value: hasAudit ? latestReport!.report.totalVulnerabilities : '—',
      icon: AlertTriangle,
    },
    {
      label: 'Pacotes monitorados',
      value:
        latestReport?.report.threatIntel?.totalPackages ??
        threatIntel?.totalPackages ??
        '—',
      icon: ShieldCheck,
    },
    {
      label: 'Veredito',
      value: hasAudit ? latestReport!.report.verdict : '—',
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Visão geral da segurança dos seus repositórios GitHub</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {(github?.connected || githubUsername) && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-2.5">
                <GitHubIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white">Conta GitHub conectada</p>
                <p className="text-sm text-emerald-400">
                  @{githubUsername}
                  {github?.connectedAt ? ` · desde ${formatDate(github.connectedAt)}` : ''}
                </p>
              </div>
            </div>
            <Badge variant="success">OAuth ativo</Badge>
          </CardContent>
        </Card>
      )}

      {!loading && !github?.connected && github?.enabled && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-amber-300">
              GitHub não conectado nesta sessão. Use <strong>Entrar com GitHub</strong> no login ou
              conecte em Auditorias.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4">
              <div className="rounded-xl bg-violet-600/15 p-3 text-violet-400">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-semibold capitalize text-white">{String(value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {latestReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Última auditoria</h2>
              <Badge variant={latestReport.report.verdict === 'not_affected' ? 'success' : 'critical'}>
                {latestReport.report.verdict}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            <p>
              @{latestReport.report.githubUsername} · {formatDate(latestReport.report.auditedAt)}
            </p>
            <p className="mt-2">
              {latestReport.report.publicRepositories} públicos · {latestReport.report.privateRepositories}{' '}
              privados · {latestReport.report.totalVulnerabilities} vulnerabilidades
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`/dashboard/audits/${latestReport.id}`}>
                <Button variant="secondary">Ver relatório</Button>
              </Link>
              <Link href="/dashboard/vulnerabilities">
                <Button variant="ghost">Vulnerabilidades</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !hasAudit && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Nenhuma auditoria ainda</h2>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-400">
            <p>
              Os repositórios da conta <strong className="text-slate-200">@{githubUsername ?? 'GitHub'}</strong>{' '}
              ainda não foram varridos. Execute a primeira auditoria para preencher repositórios,
              vulnerabilidades e veredito.
            </p>
            {threatIntel && (
              <p>
                Threat intelligence já sincronizada: {threatIntel.totalPackages} pacotes monitorados
                {threatIntel.lastSyncedAt ? ` (última sync: ${formatDate(threatIntel.lastSyncedAt)})` : ''}.
              </p>
            )}
            {canRun && github?.connected && (
              <Link href="/dashboard/audits?autostart=1">
                <Button>
                  <Play className="h-4 w-4" />
                  Executar primeira auditoria
                </Button>
              </Link>
            )}
            {canRun && !github?.connected && (
              <Link href="/dashboard/audits">
                <Button variant="secondary">
                  <GitHubIcon className="h-4 w-4" />
                  Ir para Auditorias
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
