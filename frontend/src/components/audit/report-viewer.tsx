'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function ReportViewer({
  markdown,
  auditId,
  token,
}: {
  markdown: string;
  auditId: string;
  token: string;
}) {
  function downloadMd() {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${auditId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/audit/reports/${auditId}/pdf`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-${auditId}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="font-semibold text-white">Relatório — Preview</h3>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={downloadMd}>
            <FileText className="h-4 w-4" />
            Markdown
          </Button>
          <Button variant="primary" onClick={downloadPdf}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <article className="prose prose-invert max-w-none prose-headings:text-violet-200 prose-a:text-violet-400">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      </CardContent>
    </Card>
  );
}
