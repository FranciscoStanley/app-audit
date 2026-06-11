---
name: app-audit-development
description: >-
  Orquestrador do monorepo app-audit — BackEnd NestJS + frontend Next.js.
  Use para setup, dev local, auditorias e fluxo completo da plataforma.
---

# App Audit — Development

**Autor:** Francisco Stanley Rodrigues Albuquerque · **Versão:** 1.1.0

## Estrutura

```
app-audit/
├── BackEnd/     # NestJS API :3000 — rotas em /v1
├── frontend/    # Next.js :3001
└── .cursor/     # rules + skills
```

## Setup

```bash
npm install
cd BackEnd && npm run setup   # .env + GITHUB_TOKEN
```

## Desenvolvimento

```bash
npm run dev          # backend + frontend
npm test             # Jest + Vitest
npm run test:e2e     # smoke E2E BackEnd
npm run lint         # ESLint monorepo
npm run build        # build produção
```

## API versionada

- Prefixo global: **`/v1`** (auth, audit, threat-intel)
- Health **sem** prefixo: `/health`, `/health/ready`
- OAuth callback: `http://localhost:3000/v1/auth/github/callback`

## Usuários (produção)

Sem credenciais fixas. Criar admin:

```bash
cd BackEnd
npm run users:create -- --email admin@empresa.com --password "SenhaForte12+" --name "Admin" --role admin
```

Ou `ADMIN_EMAIL` + `ADMIN_PASSWORD` no `.env` no primeiro boot. UI admin: `/dashboard/admin`.

## LGPD

Três consentimentos registrados em `data/consents.json`:

- Login e-mail (`email_login`)
- OAuth GitHub (`github_oauth`)
- Remediação (`remediation`)

## CI / Release

- CI: `.github/workflows/ci.yml` (test, e2e, lint, build)
- Security: `.github/workflows/security.yml`
- Release: tag `v*.*.*` → `.github/workflows/release.yml` + GHCR

## Skills relacionadas

- `change-sync-docs-tests` — **obrigatório** ao mudar features
- `app-audit-backend` — API NestJS
- `app-audit-frontend` — UI Next.js
- `app-audit-auth-rbac` — JWT e papéis
- `app-audit-security-scan` — scanners e remediação

## Limitações v1

Single-node, persistência em arquivos — ver `docs/LIMITATIONS.md` e `ROADMAP.md`.

## Ao concluir qualquer feature

1. Carregar skill `change-sync-docs-tests`
2. Rodar `npm test` e `npm run lint`
3. Confirmar Swagger, `docs/api.md` e collections sincronizados (`/v1`)
