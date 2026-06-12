'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Wrench } from 'lucide-react';
import { RemediationConsentModal } from '@/components/auth/remediation-consent-modal';
import { api, type PaginationMeta, type ThreatFinding } from '@/lib/api';
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
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 20;

export default function VulnerabilitiesPage() {
  const token = useAuthStore((s) => s.token);
  const canRun = useAuthStore((s) => s.can('audit:run'));
  const canRemediate = useAuthStore((s) => s.can('remediation:apply'));
  const { consentOpen, ensureConsent, onConsentAccepted, onConsentClose } = useRemediationConsent(token);
  const [findings, setFindings] = useState<Array<ThreatFinding & { repository: string; auditId: string }>>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [auditId, setAuditId] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [remediableTotal, setRemediableTotal] = useState(0);
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

  const loadFindings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const reports = await api.listReports(token, { page: 1, pageSize: 1 });
      if (!reports.data[0]) {
        setHasReports(false);
        setFindings([]);
        setMeta(null);
        return;
      }
      setHasReports(true);
      const latestId = reports.data[0].id;
      setAuditId(latestId);

      const reportDetail = await api.getReport(token, latestId);
      const cats = new Set(
        (reportDetail.report.allRepositories ?? reportDetail.report.affectedRepositories ?? [])
          .flatMap((r) => r.findings.map((f) => f.category)),
      );
      setCategories(['all', ...cats]);

      const [pageResult, remediableResult] = await Promise.all([
        api.listFindings(token, latestId, {
          page,
          pageSize: PAGE_SIZE,
          category: filter,
        }),
        api.listFindings(token, latestId, {
          page: 1,
          pageSize: 1,
          remediationAvailable: true,
        }),
      ]);

      setFindings(pageResult.data);
      setMeta(pageResult.meta);
      setRemediableTotal(remediableResult.meta.total);
    } finally {
      setLoading(false);
    }
  }, [token, page, filter]);

  useEffect(() => {
    void loadFindings();
  }, [loadFindings]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const [categories, setCategories] = useState<string[]>(['all']);

  async function handleRemediateAll() {
    if (!token || !auditId || remediating) return;
    await ensureConsent(async () => {
      void applyAllRemediationInBackground(token, auditId, remediableTotal);
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
        {canRemediate && remediableTotal > 0 && auditId && (
          <Button onClick={handleRemediateAll} loading={remediating}>
            <Wrench className="h-4 w-4" />
            Corrigir todas ({remediableTotal})
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
        {findings.map((f) => (
          <VulnerabilityCard key={f.id} finding={f} repository={f.repository} auditId={auditId} />
        ))}
        {hasReports && findings.length === 0 && !loading && (
          <p className="text-slate-400">Nenhuma vulnerabilidade nesta categoria.</p>
        )}
      </div>

      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </div>
  );
}
