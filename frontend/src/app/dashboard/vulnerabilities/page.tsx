'use client';

import { useEffect, useState } from 'react';
import { api, type ThreatFinding } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { VulnerabilityCard } from '@/components/audit/vulnerability-card';
import { Badge } from '@/components/ui/badge';

export default function VulnerabilitiesPage() {
  const token = useAuthStore((s) => s.token);
  const [findings, setFindings] = useState<Array<ThreatFinding & { repository: string; auditId: string }>>([]);
  const [auditId, setAuditId] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!token) return;
    api.listReports(token).then(async (reports) => {
      if (!reports[0]) return;
      setAuditId(reports[0].id);
      const all = await api.listFindings(token, reports[0].id);
      setFindings(all);
    });
  }, [token]);

  const categories = ['all', ...new Set(findings.map((f) => f.category))];
  const filtered = filter === 'all' ? findings : findings.filter((f) => f.category === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Vulnerabilidades</h1>
        <p className="text-slate-400">Todas as categorias detectadas na última auditoria</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}>
            <Badge variant={filter === cat ? 'primary' as 'info' : 'info'}>{cat}</Badge>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((f) => (
          <VulnerabilityCard key={f.id} finding={f} repository={f.repository} auditId={auditId} />
        ))}
        {filtered.length === 0 && <p className="text-slate-400">Nenhuma vulnerabilidade nesta categoria.</p>}
      </div>
    </div>
  );
}
