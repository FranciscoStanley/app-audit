'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BackgroundTasksBanner } from '@/components/layout/background-tasks-banner';
import { Sidebar } from '@/components/layout/sidebar';
import { useBackgroundJobPolling } from '@/hooks/use-background-job-polling';
import { useAuthHydrated, useAuthStore } from '@/stores/auth-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const token = useAuthStore((s) => s.token);
  useBackgroundJobPolling();

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  if (!hydrated || !token) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <BackgroundTasksBanner />
        {children}
      </main>
    </div>
  );
}
