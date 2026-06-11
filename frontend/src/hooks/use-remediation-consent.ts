'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

export function useRemediationConsent(token: string | null) {
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const ensureConsent = useCallback(
    async (action: () => Promise<void>) => {
      if (!token) return;
      try {
        const status = await api.remediationConsentStatus(token);
        if (status.accepted) {
          await action();
          return;
        }
      } catch {
        // fallback to modal
      }
      setPendingAction(() => action);
      setConsentOpen(true);
    },
    [token],
  );

  function onConsentAccepted() {
    setConsentOpen(false);
    const action = pendingAction;
    setPendingAction(null);
    if (action) void action();
  }

  function onConsentClose() {
    setConsentOpen(false);
    setPendingAction(null);
  }

  return {
    consentOpen,
    ensureConsent,
    onConsentAccepted,
    onConsentClose,
  };
}
