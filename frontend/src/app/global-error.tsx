'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-[#0c0f1a] p-6 text-slate-300">
        <div className="max-w-md space-y-4 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="text-2xl font-bold text-white">Algo deu errado</h1>
          <p className="text-sm text-slate-400">{error.message || 'Erro inesperado na aplicação.'}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={reset}>Recarregar</Button>
            <Link href="/login">
              <Button variant="secondary">Login</Button>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
