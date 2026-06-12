'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBackgroundTasksStore } from '@/stores/background-tasks-store';
import { useParams } from 'next/navigation';
import { api, type AuditReport, type PaginationMeta, type ThreatFinding } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { ReportViewer } from '@/components/audit/report-viewer';
import { VulnerabilityCard } from '@/components/audit/vulnerability-card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 20;

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [findings, setFindings] = useState<Array<ThreatFinding & { repository: string }>>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const remediationTasks = useBackgroundTasksStore((s) => s.tasks);
  const processedRemediationCompletions = useRef(new Set<string>());

  const loadFindings = useCallback(async () => {
    if (!token || !id) return;
    const result = await api.listFindings(token, id, { page, pageSize: PAGE_SIZE });
    setFindings(result.data);
    setMeta(result.meta);
  }, [token, id, page]);

  useEffect(() => {
    if (!token || !id) return;
    api.getReport(token, id).then((r) => setReport(r.report));
    api.getMarkdown(token, id).then(setMarkdown);
  }, [token, id]);

  useEffect(() => {
    void loadFindings();
  }, [loadFindings]);

  useEffect(() => {
    if (!token || !id) return;
    let shouldRefresh = false;
    for (const task of Object.values(remediationTasks)) {
      if (
        (task.type !== 'remediation-single' && task.type !== 'remediation-bulk') ||
        (task.status !== 'success' && task.status !== 'error') ||
        !task.completedAt
      ) {
        continue;
      }
      if (task.type === 'remediation-bulk' && task.metadata?.auditId !== id) {
        continue;
      }
      const key = `${task.id}:${task.completedAt}`;
      if (processedRemediationCompletions.current.has(key)) continue;
      processedRemediationCompletions.current.add(key);
      shouldRefresh = true;
    }
    if (!shouldRefresh) return;
    void loadFindings();
    api.getReport(token, id).then((r) => setReport(r.report));
  }, [remediationTasks, token, id, loadFindings]);

  if (!report) return <p className="text-slate-400">Carregando...</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-white">Auditoria</h1>
        <Badge variant={report.verdict === 'not_affected' ? 'success' : 'critical'}>{report.verdict}</Badge>
      </div>

      {token && markdown && <ReportViewer markdown={markdown} auditId={id} token={token} />}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">
          Vulnerabilidades ({meta?.total ?? report.totalVulnerabilities})
        </h2>
        {findings.length === 0 ? (
          <p className="text-slate-400">Nenhuma vulnerabilidade detectada.</p>
        ) : (
          findings.map((f) => (
            <VulnerabilityCard key={f.id} finding={f} repository={f.repository} auditId={id} />
          ))
        )}
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </section>
    </div>
  );
}
