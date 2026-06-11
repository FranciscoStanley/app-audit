'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, type AuditReport } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { ReportViewer } from '@/components/audit/report-viewer';
import { VulnerabilityCard } from '@/components/audit/vulnerability-card';
import { Badge } from '@/components/ui/badge';

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    api.getReport(token, id).then((r) => setReport(r.report));
    api.getMarkdown(token, id).then(setMarkdown);
  }, [token, id]);

  if (!report) return <p className="text-slate-400">Carregando...</p>;

  const findings = report.allRepositories?.flatMap((r) =>
    r.findings.map((f) => ({ ...f, repository: r.fullName })),
  ) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-white">Auditoria</h1>
        <Badge variant={report.verdict === 'not_affected' ? 'success' : 'critical'}>{report.verdict}</Badge>
      </div>

      {token && markdown && <ReportViewer markdown={markdown} auditId={id} token={token} />}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Vulnerabilidades ({findings.length})</h2>
        {findings.length === 0 ? (
          <p className="text-slate-400">Nenhuma vulnerabilidade detectada.</p>
        ) : (
          findings.map((f) => (
            <VulnerabilityCard key={f.id} finding={f} repository={f.repository} auditId={id} />
          ))
        )}
      </section>
    </div>
  );
}
