'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, FileSearch, AlertTriangle, Database, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/audits', label: 'Auditorias', icon: FileSearch },
  { href: '/dashboard/vulnerabilities', label: 'Vulnerabilidades', icon: AlertTriangle },
  { href: '/dashboard/threat-intel', label: 'Threat Intel', icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const navLinks = [
    ...links,
    ...(user?.role === 'admin'
      ? [{ href: '/dashboard/admin', label: 'Administração', icon: Settings }]
      : []),
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-white/10 bg-[#0c0f1a]/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-white">App Audit</p>
          <p className="text-xs text-slate-400">Security Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-violet-600/20 text-violet-200'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-xl bg-white/5 px-3 py-2">
          <p className="truncate text-sm font-medium text-slate-200">{user?.name}</p>
          {user?.githubUsername && (
            <p className="truncate text-xs text-emerald-400/90">@{user.githubUsername}</p>
          )}
          <p className="truncate text-xs text-slate-500">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
