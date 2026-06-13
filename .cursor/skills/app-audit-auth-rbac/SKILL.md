---
name: app-audit-auth-rbac
description: >-
  JWT e RBAC do app-audit — papéis, permissões, guards. Use ao modificar
  autenticação, autorização ou proteção de rotas.
---

# App Audit — Auth & RBAC

## Papéis

| Papel | Permissões |
|-------|------------|
| admin | tudo |
| auditor | audit, remediation, threat-intel |
| viewer | audit:read, audit:download |

## Backend

- `AuthModule` — JWT strategy
- `@Permissions('audit:run')` + `RolesGuard`
- Constantes em `domain/constants/rbac.constants.ts`

## Frontend

- `useAuthStore().can('audit:run')` — UI condicional
- Token persistido em localStorage via Zustand

## Usuários

Persistidos em `BackEnd/data/users.json`. Criar via `npm run users:create` ou `POST /auth/users`.

Administrador padrão: **Francisco Stanley Rodrigues Albuquerque** (`franciscothestanley@gmail.com` / `@FranciscoStanley`), configurável via `ADMIN_EMAIL`, `ADMIN_NAME` e `ADMIN_GITHUB_USERNAME`. Login GitHub ou usuário existente com esse email/username recebe papel `admin` automaticamente.
