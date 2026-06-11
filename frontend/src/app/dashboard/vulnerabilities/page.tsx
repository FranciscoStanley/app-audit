'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Wrench } from 'lucide-react';
import { RemediationConsentModal } from '@/components/auth/remediation-consent-modal';
import { api, type ThreatFinding } from '@/lib/api';
import {
  applyAllRemediationInBackground,
  bulkRemediationTaskId,
  type BulkRemediationTaskResult,
  useBackgroundTasksStore,
} from '@/stores/background-tasks-store';
import { useRemediationConsent } from '@/hooks/use-remediation-consent';
import { useAuthStore } from '@/stores/auth-store';
import { VulnerabilityCard } from '@/components/audit/vulnerability-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function VulnerabilitiesPage() {
  const token = useAuthStore((s) => s.token);
  const canRun = useAuthStore((s) => s.can('audit:run'));
  const canRemediate = useAuthStore((s) => s.can('remediation:apply'));
  const { consentOpen, ensureConsent, onConsentAccepted, onConsentClose } = useRemediationConsent(token);
  const [findings, setFindings] = useState<Array<ThreatFinding & { repository: string; auditId: string }>>([]);
  const [auditId, setAuditId] = useState('');
  const [filter, setFilter] = useState('all');
  const [hasReports, setHasReports] = useState(true);
  const [loading, setLoading] = useState(true);
  const bulkTask = useBackgroundTasksStore((s) =>
    auditId ? s.tasks[bulkRemediationTaskId(auditId)] : undefined,
  );
  const remediating = bulkTask?.status === 'running';
  const bulkResult =
    bulkTask?.status === 'success' && bulkTask.result && 'message' in bulkTask.result
      ? (bulkTask.result as BulkRemediationTaskResult)
      : bulkTask?.status === 'error'
        ? { message: bulkTask.error ?? 'Falha na remediação em lote', pullRequests: [] as string[] }
        : null;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .listReports(token)
      .then(async (reports) => {
        if (!reports[0]) {
          setHasReports(false);
          setFindings([]);
          return;
        }
        setHasReports(true);
        setAuditId(reports[0].id);
        const all = await api.listFindings(token, reports[0].id);
        setFindings(all);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const categories = ['all', ...new Set(findings.map((f) => f.category))];
  const filtered = filter === 'all' ? findings : findings.filter((f) => f.category === filter);
  const remediableCount = findings.filter((f) => f.remediationAvailable).length;

  async function handleRemediateAll() {
    if (!token || !auditId || remediating) return;
    await ensureConsent(async () => {
      void applyAllRemediationInBackground(token, auditId, remediableCount);
    });
  }

  return (
    <div className="space-y-6">
      <RemediationConsentModal
        open={consentOpen}
        token={token}
        onClose={onConsentClose}
        onAccepted={onConsentAccepted}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Vulnerabilidades</h1>
          <p className="text-slate-400">Todas as categorias detectadas na última auditoria</p>
        </div>
        {canRemediate && remediableCount > 0 && auditId && (
          <Button onClick={handleRemediateAll} loading={remediating}>
            <Wrench className="h-4 w-4" />
            Corrigir todas ({remediableCount})
          </Button>
        )}
      </div>

      {bulkResult && (
        <div className="space-y-1">
          <p className={`text-sm ${bulkTask?.status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
            {bulkResult.message}
          </p>
          {bulkResult.pullRequests.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block text-sm text-indigo-400 underline">
              {url}
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}>
            <Badge variant={filter === cat ? 'primary' as 'info' : 'info'}>{cat}</Badge>
          </button>
        ))}
      </div>

      {!loading && !hasReports && (
        <Card>
          <CardContent className="space-y-4 py-6 text-sm text-slate-400">
            <p>Nenhuma auditoria foi executada ainda. As vulnerabilidades aparecem após a primeira varredura dos repositórios GitHub.</p>
            {canRun && (
              <Link href="/dashboard/audits?autostart=1">
                <Button>
                  <Play className="h-4 w-4" />
                  Executar primeira auditoria
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((f) => (
          <VulnerabilityCard key={f.id} finding={f} repository={f.repository} auditId={auditId} />
        ))}
        {hasReports && filtered.length === 0 && !loading && (
          <p className="text-slate-400">Nenhuma vulnerabilidade nesta categoria.</p>
        )}
      </div>
    </div>
  );
}
