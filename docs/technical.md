# Documentação Técnica — App Audit

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Stack

| Componente | Tecnologia | Versão |
|------------|------------|--------|
| Monorepo | npm workspaces | — |
| API | NestJS | 11.x |
| Frontend | Next.js App Router | 16.x |
| Linguagem | TypeScript | 5.x |
| Auth | JWT + Passport | — |
| UI | Tailwind CSS 4 | — |
| Estado (FE) | Zustand | — |
| Testes BE | Jest | 30.x |
| Testes FE | Vitest | 4.x |
| PDF | md-to-pdf | 5.x |
| GitHub | gh CLI | — |

## Monorepo e `node_modules` na raiz

O projeto usa **npm workspaces** (`package.json` na raiz com `"workspaces": ["BackEnd", "frontend"]`).

Quando você executa `npm install` na raiz:

1. O npm cria `node_modules/` na **raiz** como ponto central de resolução (hoisting).
2. Dependências compartilhadas ou referenciadas entre workspaces ficam deduplicadas na raiz.
3. Cada workspace pode ter seu próprio `node_modules/` parcial para pacotes não hoistados.

Isso é **comportamento esperado** — não é duplicação acidental. O `concurrently` (dev da raiz) também vive em `node_modules` da raiz.

Para instalar apenas um workspace:

```bash
npm install -w BackEnd
npm install -w frontend
```

## Variáveis de ambiente (BackEnd)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `PORT` | Não | Porta da API (padrão: 3000) |
| `CORS_ORIGIN` | Não | Origem do frontend (padrão: http://localhost:3001) |
| `JWT_SECRET` | Sim (prod) | Segredo para assinar tokens |
| `JWT_EXPIRES_IN` | Não | Expiração do JWT (padrão: 8h) |
| `GITHUB_TOKEN` | Sim | Token GitHub para API e advisories |
| `OSM_API_TOKEN` | Não | Token OpenSourceMalware |
| `THREAT_INTEL_REFRESH_HOURS` | Não | Intervalo de sync (padrão: 6) |
| `THREAT_INTEL_SYNC_ON_STARTUP` | Não | Sync ao iniciar (padrão: true) |
| `GITHUB_ADVISORY_MAX_PAGES` | Não | Páginas de advisories (padrão: 10) |

## Variáveis de ambiente (Frontend)

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | URL da API (padrão: http://localhost:3000) |

## Categorias de vulnerabilidade

| Categoria | Tipos de finding |
|-----------|------------------|
| Malware Indicators | `malicious_file`, `malicious_pattern`, `c2_domain` |
| Secrets Exposure | `exposed_secret` |
| CI/CD Security | `unpinned_action`, `compromised_action` |
| Dependency Vulnerabilities | `compromised_dependency`, `vulnerable_dependency`, `malware_advisory` |
| Supply Chain | `cloned_affected_repo`, `suspicious_config` |

## Endpoints da API

Base: `http://localhost:3000`

| Método | Rota | Auth | Permissão |
|--------|------|------|-----------|
| GET | `/health` | Não | — |
| POST | `/auth/login` | Não | — |
| GET | `/auth/me` | JWT | — |
| GET | `/auth/users` | JWT | admin |
| POST | `/audit/run` | JWT | audit:run |
| POST | `/audit/miasma` | JWT | audit:run |
| GET | `/audit/reports` | JWT | audit:read |
| GET | `/audit/reports/:id` | JWT | audit:read |
| GET | `/audit/reports/:id/markdown` | JWT | audit:download |
| GET | `/audit/reports/:id/pdf` | JWT | audit:download |
| GET | `/audit/reports/:id/findings` | JWT | audit:read |
| GET | `/audit/reports/:id/findings/:findingId/markdown` | JWT | audit:download |
| GET | `/audit/reports/:id/findings/:findingId/pdf` | JWT | audit:download |
| GET | `/audit/remediation/:findingId/preview` | JWT | remediation:preview |
| POST | `/audit/remediation/:findingId/apply` | JWT | remediation:apply |
| GET | `/threat-intel/status` | JWT | threat-intel:read |
| POST | `/threat-intel/sync` | JWT | threat-intel:sync |
| GET | `/threat-intel/packages` | JWT | threat-intel:read |
| GET | `/threat-intel/check` | JWT | threat-intel:read |

Swagger interativo: `http://localhost:3000/api/docs`

## Usuários

Persistidos em `BackEnd/data/users.json`. Sem credenciais fixas.

| Método | Uso |
|--------|-----|
| `ADMIN_EMAIL` + `ADMIN_PASSWORD` | Primeiro boot |
| `npm run users:create` | CLI |
| `POST /auth/users` | Admin autenticado |

## Comandos

```bash
# Raiz — desenvolvimento completo
npm run dev

# BackEnd
cd BackEnd
npm run start:dev
npm run audit:miasma
npm run threat-intel:sync
npm test

# Frontend
cd frontend
npm run dev
npm test
npm run build
```

## Testes

- **BackEnd:** `BackEnd/src/**/*.spec.ts` (Jest)
- **Frontend:** `frontend/src/**/*.test.ts` (Vitest + jsdom)

## Segurança

- Rotas protegidas exigem `Authorization: Bearer <token>`.
- RBAC via `@Permissions()` + `RolesGuard`.
- CORS restrito à origem do frontend.
- Credenciais seed são apenas para desenvolvimento — altere em produção.
