'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export default function GitHubCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Token ausente no retorno do GitHub');
      return;
    }

    api
      .me(token)
      .then((user) => {
        setAuth(token, user);
        router.replace('/dashboard');
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
