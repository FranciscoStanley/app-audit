import Link from 'next/link';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
}

export function LegalPageShell({ title, children }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-slate-300">
      <Link href="/login" className="text-sm text-violet-400 hover:underline">
        ← Voltar ao login
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">Última atualização: junho de 2026 · Versão 1.1.0</p>
      <div className="prose prose-invert mt-8 max-w-none space-y-8 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-inside list-disc space-y-1 text-slate-400">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
