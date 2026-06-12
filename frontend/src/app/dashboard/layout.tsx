'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BackgroundTasksBanner } from '@/components/layout/background-tasks-banner';
import { ToastProvider } from '@/components/providers/toast-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { useBackgroundJobPolling } from '@/hooks/use-background-job-polling';
import { useBackgroundTaskNotifications } from '@/hooks/use-background-task-notifications';
import { useBackgroundTasksHydrated } from '@/stores/background-tasks-store';
import { useAuthHydrated, useAuthStore } from '@/stores/auth-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const tasksHydrated = useBackgroundTasksHydrated();
  const token = useAuthStore((s) => s.token);
  useBackgroundJobPolling();
  useBackgroundTaskNotifications();

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  if (!hydrated || !tasksHydrated || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070a14] text-slate-400">
        Carregando…
      </div>
    );
  }

  return (
    <>
      <ToastProvider />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">
          <BackgroundTasksBanner />
          {children}
        </main>
      </div>
    </>
  );
}
