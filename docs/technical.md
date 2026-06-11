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
| `GITHUB_TOKEN` | Sim | Token GitHub para API, advisories e **remediação** (escopos `repo`, `security_events`) |
| `OSM_API_TOKEN` | Não | Token OpenSourceMalware |
| `THREAT_INTEL_REFRESH_HOURS` | Não | Intervalo de sync (padrão: 6) |
| `THREAT_INTEL_SYNC_ON_STARTUP` | Não | Sync ao iniciar (padrão: true) |
| `GITHUB_ADVISORY_MAX_PAGES` | Não | Páginas de advisories (padrão: 10) |
| `DATA_CONTROLLER_NAME` | Não | Nome do controlador exibido nos fluxos LGPD |
| `DATA_CONTROLLER_ADDRESS` | Não | Endereço do controlador (Política de Privacidade) |
| `PRIVACY_CONTACT_EMAIL` | Não | Canal do titular / privacidade |
| `DPO_CONTACT_EMAIL` | Não | Encarregado de dados (DPO), quando designado |

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

Base: `http://localhost:3000` · Prefixo versionado: **`/v1`** (exceto health)

| Método | Rota | Auth | Permissão |
|--------|------|------|-----------|
| GET | `/health` | Não | Liveness |
| GET | `/health/ready` | Não | Readiness |
| POST | `/v1/auth/login` | Não | — |
| GET | `/v1/auth/me` | JWT | — |
| GET | `/v1/auth/users` | JWT | admin |
| POST | `/v1/auth/users` | JWT | admin |
| POST | `/v1/audit/jobs/audit-run` | JWT | audit:run |
| POST | `/v1/audit/jobs/remediation` | JWT | remediation:apply |
| POST | `/v1/audit/jobs/remediation-all` | JWT | remediation:apply |
| GET | `/v1/audit/jobs` | JWT | audit:read |
| GET | `/v1/audit/jobs/:id` | JWT | audit:read |
| POST | `/v1/audit/run` | JWT | audit:run |
| GET | `/v1/audit/reports` | JWT | audit:read |
| GET | `/v1/audit/reports/:id` | JWT | audit:read |
| GET | `/v1/audit/reports/:id/markdown` | JWT | audit:download |
| GET | `/v1/audit/reports/:id/pdf` | JWT | audit:download |
| GET | `/v1/audit/reports/:id/findings` | JWT | audit:read |
| GET | `/v1/audit/remediation/consent` | JWT | remediation:preview |
| POST | `/v1/audit/remediation/consent/accept` | JWT | remediation:apply |
| GET | `/v1/audit/remediation/:findingId/preview` | JWT | remediation:preview |
| POST | `/v1/audit/remediation/:findingId/apply` | JWT | remediation:apply |
| POST | `/v1/audit/reports/:id/remediate-all` | JWT | remediation:apply |
| GET | `/v1/threat-intel/status` | JWT | threat-intel:read |
| POST | `/v1/threat-intel/sync` | JWT | threat-intel:sync |
| GET | `/threat-intel/packages` | JWT | threat-intel:read |
| GET | `/threat-intel/check` | JWT | threat-intel:read |

Swagger interativo: `http://localhost:3000/api/docs`

## Remediação automática

| Capacidade | Detalhe |
|------------|---------|
| Git workspace | Clone shallow → alterações → lockfile → commit único |
| Lockfiles | pnpm, npm, yarn, pip (`requirements.txt`) |
| Branch protegida | Fallback automático para Pull Request |
| Dependabot | Scanner lê alertas abertos; correção atualiza manifesto + lockfile |
| Em lote | `POST /audit/jobs/remediation-all` (async) ou `POST /audit/reports/:id/remediate-all` (sync) |
| Jobs | Persistência em `data/jobs/{id}/job.json`; processador in-process single-node |

Requisitos no servidor: `git`, `gh` autenticado, `pnpm`/`npm` no PATH (Dockerfile inclui git, gh, pnpm).

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
