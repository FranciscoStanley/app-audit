import { cn } from '@/lib/utils';

const variants: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  info: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export function Badge({ children, variant = 'info', className }: { children: React.ReactNode; variant?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', variants[variant] ?? variants.info, className)}>
      {children}
    </span>
  );
}
