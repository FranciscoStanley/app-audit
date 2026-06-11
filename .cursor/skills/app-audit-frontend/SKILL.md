---
name: app-audit-frontend
description: >-
  Frontend Next.js do app-audit — dashboard, auditorias, vulnerabilidades, PDF/MD.
  Use ao criar páginas, componentes ou integrar com a API em frontend/.
---

# App Audit — Frontend

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Stack

Next.js 16 App Router, TypeScript, Tailwind, Zustand, Vitest.

## Estrutura

```
frontend/src/
  app/login/           # autenticação
  app/dashboard/       # área autenticada
  components/ui/       # design system
  components/audit/    # relatórios, vulnerabilidades
  lib/api.ts           # client HTTP
  stores/auth-store.ts # JWT + RBAC client
```

## Comandos

```bash
cd frontend
npm run dev      # :3001
npm test         # Vitest
```

## Ao alterar UI ou API client

Siga `change-sync-docs-tests`: Vitest em `src/**/*.test.ts`, `lib/api.ts`, docs se fluxo mudou.

## API

`NEXT_PUBLIC_API_URL=http://localhost:3000`

Token JWT em `Authorization: Bearer` via Zustand persist.
