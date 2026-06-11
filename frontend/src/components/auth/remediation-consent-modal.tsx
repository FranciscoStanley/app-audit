'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Wrench } from 'lucide-react';
import { api, type RemediationConsentInfo } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  token: string | null;
  onClose: () => void;
  onAccepted: () => void;
}

export function RemediationConsentModal({ open, token, onClose, onAccepted }: Props) {
  const [info, setInfo] = useState<RemediationConsentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [remediation, setRemediation] = useState(false);
  const [risks, setRisks] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    setError('');
    setTerms(false);
    setPrivacy(false);
    setRemediation(false);
    setRisks(false);

    api
      .remediationConsentStatus(token)
      .then((data) => {
        setInfo(data);
      })
      .catch(() => setError('Não foi possível carregar os termos de remediação.'));
  }, [open, token, onAccepted]);

  const allChecked = terms && privacy && remediation && risks;

  async function handleAccept() {
    if (!allChecked || !token) return;
    setLoading(true);
    setError('');
    try {
      await api.acceptRemediationConsent(token, {
        termsAccepted: terms,
        privacyAccepted: privacy,
        remediationAcknowledged: remediation,
        risksAcknowledged: risks,
      });
      onAccepted();
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
        aria-labelledby="remediation-consent-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#0c0f1a] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-600/20 p-2 text-amber-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 id="remediation-consent-title" className="text-lg font-semibold text-white">
                Consentimento — Remediação automática
              </h2>
              <p className="text-xs text-slate-400">LGPD · Versão {info?.policyVersion ?? '…'}</p>
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
                <h3 className="mb-2 font-medium text-white">Controlador</h3>
                <p>
                  <strong>{info.controllerName}</strong> —{' '}
                  <a href={`mailto:${info.contactEmail}`} className="text-violet-400 hover:underline">
                    {info.contactEmail}
                  </a>
                </p>
                <p className="mt-2 text-slate-400">{info.legalBasis}</p>
              </section>

              <section>
                <h3 className="mb-2 font-medium text-white">Ações autorizadas</h3>
                <div className="space-y-3">
                  {info.actions.map((a) => (
                    <div key={a.action} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="font-medium text-amber-300">{a.title}</p>
                      <p className="mt-1 text-slate-400">{a.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-medium text-white">Riscos e responsabilidades</h3>
                <ul className="list-inside list-disc space-y-1 text-slate-400">
                  {info.risks.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3 border-t border-white/10 pt-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
                  <span>
                    Li e aceito o{' '}
                    <Link href="/legal/termos" target="_blank" className="text-violet-400 hover:underline">
                      Termo de Uso
                    </Link>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1" />
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
                    checked={remediation}
                    onChange={(e) => setRemediation(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Autorizo o App Audit a aplicar correções automatizadas nos repositórios GitHub que eu indicar,
                    incluindo alteração de arquivos, commits e Pull Requests
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={risks} onChange={(e) => setRisks(e.target.checked)} className="mt-1" />
                  <span>
                    Estou ciente dos riscos descritos acima e de que devo revisar alterações antes do merge em produção
                  </span>
                </label>
              </section>

              <p className="text-xs text-slate-500">
                Você pode recusar este consentimento e continuar utilizando auditorias e relatórios sem remediação
                automática.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Não autorizo
          </Button>
          <Button type="button" disabled={!allChecked || loading} loading={loading} onClick={handleAccept}>
            Autorizo remediação
          </Button>
        </div>
      </div>
    </div>
  );
}
