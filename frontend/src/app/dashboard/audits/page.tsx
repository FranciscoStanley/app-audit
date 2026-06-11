'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Play, ExternalLink, AlertTriangle } from 'lucide-react';
import { GitHubIcon } from '@/components/icons/github-icon';
import { GitHubOAuthConsentModal } from '@/components/auth/github-oauth-consent-modal';
import { api, type GitHubStatus } from '@/lib/api';
import {
  AUDIT_TASK_ID,
  runAuditInBackground,
  useBackgroundTasksStore,
} from '@/stores/background-tasks-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default function AuditsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const canRun = useAuthStore((s) => s.can('audit:run'));
  const [reports, setReports] = useState<Array<{ id: string; createdAt: string; report: { verdict: string; githubUsername: string; totalVulnerabilities: number } }>>([]);
  const auditTask = useBackgroundTasksStore((s) => s.tasks[AUDIT_TASK_ID]);
  const running = auditTask?.status === 'running';
  const [github, setGithub] = useState<GitHubStatus | null>(null);
  const [auditError, setAuditError] = useState('');
  const [consentOpen, setConsentOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const autostartDone = useRef(false);

  async function load() {
    if (!token) return [];
    const data = await api.listReports(token);
    setReports(data as typeof reports);
    return data;
  }

  useEffect(() => {
    if (!token) return;
    setLoaded(false);
    Promise.all([
      load(),
      api.githubStatus(token).then(setGithub).catch(() => null),
      api.me(token).then(setUser).catch(() => null),
    ]).finally(() => setLoaded(true));
  }, [token, setUser]);

  async function runAudit() {
    if (!token || running) return;
    setAuditError('');
    void runAuditInBackground(token);
  }

  useEffect(() => {
    if (!token) return;
    if (auditTask?.status === 'success') {
      void load();
      void api.me(token).then(setUser).catch(() => null);
    }
    if (auditTask?.status === 'error') {
      setAuditError(auditTask.error ?? 'Falha ao executar auditoria');
    }
  }, [auditTask?.status, auditTask?.error, token, setUser]);

  useEffect(() => {
    if (autostartDone.current) return;
    if (searchParams.get('autostart') !== '1') return;
    if (!loaded || !token || !canRun || !github?.connected || running) return;

    router.replace('/dashboard/audits');
    if (reports.length > 0) {
      autostartDone.current = true;
      return;
    }

    autostartDone.current = true;
    void runAudit();
  }, [searchParams, loaded, token, canRun, github, reports.length, running, router]);

  async function disconnectGitHub() {
    if (!token) return;
    setDisconnecting(true);
    try {
      await api.disconnectGitHub(token);
      setGithub((g) => (g ? { ...g, connected: false, githubUsername: null } : g));
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <GitHubOAuthConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAccepted={(url) => {
          setConsentOpen(false);
          window.location.href = url;
        }}
      />

      {github && !github.connected && github.enabled && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-400" />
              <div>
                <p className="font-medium text-white">Conecte o GitHub para auditar seus repositórios</p>
                <p className="text-sm text-slate-400">
                  O login com GitHub concede acesso a repositórios públicos e privados da sua conta.
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => setConsentOpen(true)}>
              <GitHubIcon className="h-4 w-4" />
              Conectar GitHub
            </Button>
          </CardContent>
        </Card>
      )}

      {github?.connected && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-emerald-400">GitHub conectado como @{github.githubUsername}</p>
          <Button variant="ghost" loading={disconnecting} onClick={disconnectGitHub}>
            Desconectar (revogar consentimento)
          </Button>
        </div>
      )}

      {running && (
        <p className="text-sm text-amber-400">
          Auditoria em andamento — pode levar mais de 10 minutos em contas com muitos repositórios. Aguarde até concluir.
        </p>
      )}

      {auditError && <p className="text-sm text-red-400">{auditError}</p>}

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
        {reports.length === 0 && !running && (
          <Card>
            <CardHeader>
              <p className="text-slate-400">
                Nenhuma auditoria executada ainda. Clique em <strong>Nova auditoria</strong> para
                varrer todos os repositórios da conta GitHub conectada.
              </p>
            </CardHeader>
          </Card>
        )}

        {running && (
          <Card>
            <CardHeader>
              <p className="text-slate-300">Auditoria em andamento — varrendo repositórios GitHub...</p>
              <p className="mt-1 text-sm text-slate-500">Pode levar alguns minutos conforme a quantidade de repos.</p>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
