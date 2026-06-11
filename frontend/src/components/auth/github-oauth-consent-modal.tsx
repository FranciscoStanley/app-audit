'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Shield, ExternalLink } from 'lucide-react';
import { api, type GitHubConsentInfo } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  onAccepted: (authorizeUrl: string) => void;
}

export function GitHubOAuthConsentModal({ open, onClose, onAccepted }: Props) {
  const [info, setInfo] = useState<GitHubConsentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [dataProcessing, setDataProcessing] = useState(false);
  const [scopes, setScopes] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setTerms(false);
    setPrivacy(false);
    setDataProcessing(false);
    setScopes(false);
    api.githubConsentInfo().then(setInfo).catch(() => setError('Não foi possível carregar os termos de consentimento.'));
  }, [open]);

  const allChecked = terms && privacy && dataProcessing && scopes;

  async function handleAccept() {
    if (!allChecked) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.acceptGitHubConsent({
        termsAccepted: terms,
        privacyAccepted: privacy,
        dataProcessingAccepted: dataProcessing,
        scopesAcknowledged: scopes,
      });
      onAccepted(res.authorizeUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao registrar consentimento');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-consent-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#0c0f1a] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600/20 p-2 text-violet-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 id="github-consent-title" className="text-lg font-semibold text-white">
                Consentimento — Login com GitHub
              </h2>
              <p className="text-xs text-slate-400">
                LGPD (Lei 13.709/2018) · Versão {info?.policyVersion ?? '…'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm text-slate-300">
          {error && <p className="text-red-400">{error}</p>}

          {info && (
            <>
              <section>
                <h3 className="mb-2 font-medium text-white">Controlador de dados</h3>
                <p>
                  <strong>{info.controllerName}</strong> — contato:{' '}
                  <a href={`mailto:${info.contactEmail}`} className="text-violet-400 hover:underline">
                    {info.contactEmail}
                  </a>
                </p>
                <p className="mt-2 text-slate-400">{info.legalBasis}</p>
              </section>

              <section>
                <h3 className="mb-2 font-medium text-white">Finalidades do tratamento</h3>
                <ul className="list-inside list-disc space-y-1 text-slate-400">
                  {info.purposes.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-2 font-medium text-white">Permissões solicitadas ao GitHub</h3>
                <div className="space-y-3">
                  {info.scopes.map((s) => (
                    <div key={s.scope} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="font-medium text-violet-300">
                        <code className="text-xs">{s.scope}</code> — {s.title}
                      </p>
                      <p className="mt-1 text-slate-400">{s.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-medium text-white">Seus direitos (titular dos dados)</h3>
                <ul className="list-inside list-disc space-y-1 text-slate-400">
                  {info.dataSubjectRights.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="mt-2 text-slate-500">{info.retentionSummary}</p>
              </section>

              {info.internationalTransfer && (
                <section>
                  <h3 className="mb-2 font-medium text-white">Transferência internacional</h3>
                  <p className="text-slate-400">{info.internationalTransfer}</p>
                </section>
              )}

              <section>
                <h3 className="mb-2 font-medium text-white">Terceiros</h3>
                <ul className="space-y-1 text-slate-400">
                  {info.thirdParties.map((t) => (
                    <li key={t.name}>
                      {t.name} — {t.purpose}
                    </li>
                  ))}
                </ul>
                <a
                  href="https://docs.github.com/pt/site-policy/privacy-policies/github-privacy-statement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-violet-400 hover:underline"
                >
                  Política de Privacidade do GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              </section>

              <section className="space-y-3 border-t border-white/10 pt-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Li e aceito o{' '}
                    <Link href="/legal/termos" target="_blank" className="text-violet-400 hover:underline">
                      Termo de Uso
                    </Link>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={privacy}
                    onChange={(e) => setPrivacy(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Li e aceito a{' '}
                    <Link href="/legal/privacidade" target="_blank" className="text-violet-400 hover:underline">
                      Política de Privacidade
                    </Link>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={dataProcessing}
                    onChange={(e) => setDataProcessing(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Consinto com o tratamento dos meus dados pessoais para as finalidades descritas,
                    conforme a LGPD
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={scopes}
                    onChange={(e) => setScopes(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Estou ciente das permissões OAuth listadas acima e autorizo o acesso de leitura aos
                    meus repositórios GitHub para auditoria de segurança
                  </span>
                </label>
              </section>

              <p className="text-xs text-slate-500">
                Você pode recusar o consentimento e continuar usando login por e-mail/senha, quando
                disponível. A recusa impede apenas a autenticação via GitHub.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Não aceito
          </Button>
          <Button type="button" disabled={!allChecked || loading} loading={loading} onClick={handleAccept}>
            Aceito e continuar com GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}
