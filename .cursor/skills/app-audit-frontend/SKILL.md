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
  components/layout/   # sidebar, banner de jobs
  hooks/               # use-background-job-polling, consent
  lib/api.ts           # client HTTP (+ jobs async)
  stores/              # auth-store, background-tasks-store
```

## Jobs em segundo plano

- Varredura e remediação usam `POST /v1/audit/jobs/*` + polling em `GET /v1/audit/jobs/:id`
- `background-tasks-store.ts` persiste estado local; `useBackgroundJobPolling` sincroniza com o servidor
- Banner global em `dashboard/layout.tsx`

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
