import { Suspense } from 'react';

export default function GitHubCallbackLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400">Carregando...</div>}>{children}</Suspense>;
}
