'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  githubConnected?: boolean;
  githubUsername?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  can: (permission: string) => boolean;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['audit:run', 'audit:read', 'audit:download', 'remediation:apply', 'threat-intel:sync'],
  auditor: ['audit:run', 'audit:read', 'audit:download', 'remediation:apply', 'threat-intel:sync'],
  viewer: ['audit:read', 'audit:download'],
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      can: (permission) => {
        const role = get().user?.role ?? '';
        return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
      },
    }),
    { name: 'app-audit-auth', skipHydration: true },
  ),
);

/** Aguarda reidratação do persist no cliente (padrão Next.js App Router) */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    void useAuthStore.persist.rehydrate().then(() => {
      if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    });
    return unsub;
  }, []);

  return hydrated;
}
