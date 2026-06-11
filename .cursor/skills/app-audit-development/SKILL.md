---
name: app-audit-development
description: >-
  Orquestrador do monorepo app-audit — BackEnd NestJS + frontend Next.js.
  Use para setup, dev local, auditorias e fluxo completo da plataforma.
---

# App Audit — Development

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Estrutura

```
app-audit/
├── BackEnd/     # NestJS API :3000
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
```

## Usuários (produção)

Sem credenciais fixas. Criar admin:

```bash
cd BackEnd
npm run users:create -- --email admin@empresa.com --password "SenhaForte12+" --name "Admin" --role admin
```

Ou `ADMIN_EMAIL` + `ADMIN_PASSWORD` no `.env` no primeiro boot.

## Skills relacionadas

- `app-audit-backend` — API NestJS
- `app-audit-frontend` — UI Next.js
- `app-audit-auth-rbac` — JWT e papéis
- `app-audit-security-scan` — scanners e remediação
