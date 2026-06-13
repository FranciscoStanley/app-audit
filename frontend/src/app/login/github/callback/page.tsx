'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { rememberGitHubConsent } from '@/lib/legal-consent-storage';
import { useAuthStore } from '@/stores/auth-store';

export default function GitHubCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      setError('Código OAuth ausente no retorno do GitHub');
      return;
    }

    api
      .exchangeGitHubCode(code)
      .then((res) => {
        void api.legalInfo().then((info) => rememberGitHubConsent(info.policyVersion));
        setAuth(res.accessToken, res.user);
        const target = res.user.githubConnected
          ? '/dashboard/audits?autostart=1'
          : '/dashboard';
        // Garante persistência no localStorage antes da navegação ao dashboard
        queueMicrotask(() => router.replace(target));
      })
      .catch(() => setError('Falha ao validar sessão após login GitHub'));
  }, [params, router, setAuth]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-slate-400">
      Conectando conta GitHub...
    </div>
  );
}
