'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-400" />
      <h2 className="text-xl font-semibold text-white">Erro no dashboard</h2>
      <p className="max-w-md text-sm text-slate-400">{error.message || 'Ocorreu um erro inesperado.'}</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Link href="/dashboard">
          <Button variant="secondary">Ir ao início</Button>
        </Link>
      </div>
    </div>
  );
}
