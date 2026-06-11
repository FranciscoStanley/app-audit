'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, ExternalLink, AlertTriangle } from 'lucide-react';
import { GitHubIcon } from '@/components/icons/github-icon';
import { GitHubOAuthConsentModal } from '@/components/auth/github-oauth-consent-modal';
import { api, type GitHubStatus } from '@/lib/api';
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
  const [github, setGithub] = useState<GitHubStatus | null>(null);
  const [auditError, setAuditError] = useState('');
  const [consentOpen, setConsentOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function load() {
    if (!token) return;
    const data = await api.listReports(token);
    setReports(data as typeof reports);
  }

  useEffect(() => {
    load();
    if (token) api.githubStatus(token).then(setGithub).catch(() => null);
  }, [token]);

  async function runAudit() {
    if (!token) return;
    setRunning(true);
    setAuditError('');
    try {
      await api.runAudit(token);
      await load();
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : 'Falha ao executar auditoria');
    } finally {
      setRunning(false);
    }
  }

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
