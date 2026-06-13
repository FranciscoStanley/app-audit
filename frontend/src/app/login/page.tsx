'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { GitHubIcon } from '@/components/icons/github-icon';
import { GitHubOAuthConsentModal } from '@/components/auth/github-oauth-consent-modal';
import { api } from '@/lib/api';
import {
  hasRememberedGitHubConsent,
  rememberGitHubConsent,
  rememberLoginConsent,
} from '@/lib/legal-consent-storage';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [consentRequired, setConsentRequired] = useState(true);
  const [policyVersion, setPolicyVersion] = useState<string | null>(null);

  useEffect(() => {
    api.githubOAuthEnabled().then(setGithubEnabled).catch(() => setGithubEnabled(false));
    api.loginConsentInfo()
      .then((info) => setPolicyVersion(info.policyVersion))
      .catch(() => setPolicyVersion(null));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') === 'consent_required') {
      setError('É necessário aceitar o consentimento antes de conectar o GitHub.');
    }
  }, []);

  const refreshConsentRequirement = useCallback(async (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized.includes('@')) {
      setConsentRequired(true);
      setTermsAccepted(false);
      setPrivacyAccepted(false);
      return;
    }

    try {
      const status = await api.loginConsentRequired(normalized);
      setPolicyVersion(status.policyVersion);
      setConsentRequired(status.required);
      if (!status.required) {
        setTermsAccepted(true);
        setPrivacyAccepted(true);
      } else {
        setTermsAccepted(false);
        setPrivacyAccepted(false);
      }
    } catch {
      setConsentRequired(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshConsentRequirement(email);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [email, refreshConsentRequirement]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email, password, {
        termsAccepted: consentRequired ? termsAccepted : true,
        privacyAccepted: consentRequired ? privacyAccepted : true,
      });
      if (policyVersion) {
        rememberLoginConsent(policyVersion, email);
      }
      setAuth(res.accessToken, res.user);
      router.push('/dashboard');
    } catch {
      setError('Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  }

  function onGitHubConsentAccepted(authorizeUrl: string) {
    if (policyVersion) {
      rememberGitHubConsent(policyVersion);
    }
    setConsentOpen(false);
    window.location.href = authorizeUrl;
  }

  async function handleGitHubLogin() {
    setGithubLoading(true);
    setError('');
    try {
      if (policyVersion && hasRememberedGitHubConsent(policyVersion)) {
        const res = await api.githubAuthorize();
        rememberGitHubConsent(res.policyVersion);
        window.location.href = res.authorizeUrl;
        return;
      }
      setConsentOpen(true);
    } catch {
      setError('Não foi possível iniciar o login com GitHub.');
    } finally {
      setGithubLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <GitHubOAuthConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAccepted={onGitHubConsentAccepted}
      />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">App Audit</h1>
          <p className="text-sm text-slate-400">Plataforma de auditoria de segurança</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {githubEnabled && (
            <>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                loading={githubLoading}
                onClick={() => void handleGitHubLogin()}
              >
                <GitHubIcon className="h-4 w-4" />
                Entrar com GitHub
              </Button>
              <p className="text-center text-xs text-slate-500">
                Requer consentimento informado (LGPD) no primeiro acesso.{' '}
                <Link href="/legal/privacidade" className="text-violet-400 hover:underline">
                  Privacidade
                </Link>
                {' · '}
                <Link href="/legal/termos" className="text-violet-400 hover:underline">
                  Termos
                </Link>
              </p>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">ou email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            {consentRequired ? (
              <>
                <label className="flex cursor-pointer items-start gap-3 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5"
                    required
                  />
                  <span>
                    Li e aceito o{' '}
                    <Link href="/legal/termos" target="_blank" className="text-violet-400 hover:underline">
                      Termo de Uso
                    </Link>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-0.5"
                    required
                  />
                  <span>
                    Li e aceito a{' '}
                    <Link href="/legal/privacidade" target="_blank" className="text-violet-400 hover:underline">
                      Política de Privacidade
                    </Link>
                  </span>
                </label>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                Termos já aceitos anteriormente para esta conta.{' '}
                <Link href="/legal/termos" className="text-violet-400 hover:underline">
                  Termo de Uso
                </Link>
                {' · '}
                <Link href="/legal/privacidade" className="text-violet-400 hover:underline">
                  Privacidade
                </Link>
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={consentRequired && (!termsAccepted || !privacyAccepted)}
            >
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
