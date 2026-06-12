# Referência da API

**Base URL:** `http://localhost:3000`  
**API versionada:** prefixo `/v1` em todas as rotas REST (exceto health)  
**Swagger:** `http://localhost:3000/api/docs`  
**Autor:** Francisco Stanley Rodrigues Albuquerque

## Health (sem prefixo `/v1`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Liveness |
| GET | `/health/ready` | Readiness (storage, JWT, GitHub, threat intel) |

## Autenticação

Rotas públicas (sem JWT): `/health`, `/health/ready`, `/v1/auth/legal/info`, `/v1/auth/login/consent`, `/v1/auth/github/consent`, `POST /v1/auth/login`, `POST /v1/auth/github/consent/accept`, `POST /v1/auth/github/exchange`, `GET /v1/auth/github`, `GET /v1/auth/github/callback`, `GET /v1/auth/github/config`.

Demais rotas exigem header:

```
Authorization: Bearer <accessToken>
```

### POST /v1/auth/login

Exige aceite do Termo de Uso e da Política de Privacidade (registrado em `data/consents.json`).

```json
// Request
{
  "email": "admin@empresa.com",
  "password": "sua-senha-segura",
  "termsAccepted": true,
  "privacyAccepted": true
}

// Response 200
{
  "accessToken": "eyJhbG...",
  "user": {
    "id": "...",
    "email": "admin@audit.local",
    "name": "Administrador",
    "role": "admin"
  }
}
```

### GET /v1/auth/legal/info

Informações legais públicas (versão de política, URLs, contatos).

### GET /v1/auth/login/consent

Finalidades e base legal do login por e-mail.

### GET /v1/auth/github/consent

Informações de consentimento LGPD para OAuth GitHub (escopos, terceiros, direitos do titular).

### POST /v1/auth/github/consent/accept

Registra aceite e retorna `authorizeUrl` para redirect ao GitHub.

### GET /v1/auth/github/config

```json
{ "enabled": true }
```

### GET /v1/auth/github

Redireciona ao GitHub OAuth (`read:user`, `user:email`, `repo`).

### GET /v1/auth/github/callback

Callback OAuth — redireciona ao frontend com `?code=<código-de-uso-único>` (válido por 2 minutos).

### POST /v1/auth/github/exchange

Troca o código de uso único por JWT (evita expor token na URL).

```json
// Request
{ "code": "a1b2c3..." }

// Response 200
{
  "accessToken": "eyJhbG...",
  "user": { "id": "...", "email": "...", "name": "...", "role": "auditor", "githubConnected": true }
}
```

### GET /v1/auth/github/status

**Auth:** JWT

```json
{
  "enabled": true,
  "connected": true,
  "githubUsername": "usuario",
  "connectedAt": "2026-06-10T12:00:00.000Z"
}
```

### GET /v1/auth/me

Retorna o perfil do usuário autenticado (inclui `githubConnected`, `githubUsername`).

### GET /v1/auth/users?page=1&pageSize=20

**Permissão:** `users:manage` (admin)

Lista usuários com paginação. Resposta:

```json
{
  "data": [{ "id": "uuid", "email": "...", "name": "...", "role": "auditor" }],
  "meta": { "page": 1, "pageSize": 20, "total": 3, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
}
```

### POST /v1/auth/users

**Permissão:** `users:manage` (admin)

```json
{
  "email": "auditor@empresa.com",
  "password": "SenhaForteCom12+",
  "name": "Auditor",
  "role": "auditor"
}
```

---

## Auditoria

## Auditorias e jobs assíncronos

### POST /v1/audit/jobs/audit-run

Enfileira varredura completa (recomendado para UI e contas com muitos repositórios).

**Permissão:** `audit:run` · **Resposta:** `202 Accepted`

```json
{ "jobId": "uuid", "status": "pending" }
```

### GET /v1/audit/jobs/:id

Consulta status do job (polling). Inclui `progress` durante execução.

```json
{
  "id": "uuid",
  "type": "audit_run",
  "status": "running",
  "label": "Varredura de vulnerabilidades",
  "progress": { "phase": "scanning", "current": 3, "total": 10, "message": "org/repo" },
  "result": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

Quando `status` = `completed`, `result` contém `auditId` (varredura) ou detalhes de remediação.

### GET /v1/audit/jobs?page=1&pageSize=20&status=running

Lista jobs do usuário autenticado (paginado). Query opcional: `status` (`pending`, `running`, `completed`, `failed`). `pageSize` máximo: **100**.

### POST /v1/audit/jobs/remediation

**Permissão:** `remediation:apply` · **Body:** `{ "findingId": "uuid" }` · **Resposta:** `202`

### POST /v1/audit/jobs/remediation-all

**Permissão:** `remediation:apply` · **Body:** `{ "auditId": "uuid" }` · **Resposta:** `202`

### POST /v1/audit/run?save=true

Executa auditoria **de forma síncrona** (legado/CLI). Preferir `POST /audit/jobs/audit-run` na UI.

**Permissão:** `audit:run`

```json
// Response 200
{
  "report": { "auditedAt": "...", "verdict": "not_affected", ... },
  "savedTo": "docs/security/miasma-worm-audit-report.md",
  "auditId": "uuid"
}
```

### GET /v1/audit/reports?page=1&pageSize=20

Lista **resumos** de relatórios (sem payload completo). Campos em `data[]`: `id`, `createdAt`, `githubUsername`, `verdict`, `totalVulnerabilities`, `repositoryCount`.

### GET /v1/audit/reports/:id

Retorna relatório completo por ID.

### GET /v1/audit/reports/:id/markdown

Download do relatório consolidado em Markdown.

### GET /v1/audit/reports/:id/pdf

Download do relatório consolidado em PDF.

### GET /v1/audit/reports/:id/findings?page=1&pageSize=20

Lista vulnerabilidades do relatório (paginado). Filtros opcionais: `category`, `severity`, `remediationAvailable=true`.

### GET /v1/audit/reports/:id/findings/:findingId/markdown

Download do relatório individual da vulnerabilidade (Markdown).

### GET /v1/audit/reports/:id/findings/:findingId/pdf

Download do relatório individual da vulnerabilidade (PDF).

---

## Remediação

Remediação **100% automática** via Git workspace + GitHub API:

- Clone shallow do repositório, alterações locais, **regeneração de lockfile** (pnpm/npm/yarn/pip)
- Commit único por vulnerabilidade
- Push direto ao branch padrão ou **Pull Request automático** se branch protegida
- **Monorepo:** alertas Dependabot do mesmo pacote/GHSA corrigidos em todos os `package.json` num único commit
- **Sincronização GitHub Security:** após push na branch padrão, aguarda até 90s e reporta quantos alertas Dependabot fecharam (`dependabot.closedAlertNumbers` na resposta)
- Com PR aberta, alertas só fecham após **merge** na branch padrão (GitHub reavalia o lockfile)

### GET /v1/audit/remediation/consent

**Auth:** JWT · Permissão: `remediation:preview`

Retorna status e informações do consentimento LGPD para remediação automática (`accepted: true|false`).

### POST /v1/audit/remediation/consent/accept

**Auth:** JWT · Permissão: `remediation:apply`

Registra consentimento específico para alterações em repositórios GitHub.

```json
{
  "termsAccepted": true,
  "privacyAccepted": true,
  "remediationAcknowledged": true,
  "risksAcknowledged": true
}
```

### GET /v1/audit/remediation/:findingId/preview

Retorna plano de remediação para a vulnerabilidade (todos os passos marcados como automatizados).

### POST /v1/audit/remediation/:findingId/apply

Aplica remediação **de forma síncrona** (legado). Preferir `POST /audit/jobs/remediation` na UI.

### POST /v1/audit/reports/:id/remediate-all

Aplica remediação em lote **de forma síncrona** (legado). Preferir `POST /audit/jobs/remediation-all` na UI.

Resposta: `{ total, succeeded, failed, results[] }`

---

## Threat Intelligence

### GET /v1/threat-intel/status

Status da base local de threat intel.

### POST /v1/threat-intel/sync

Força sincronização com GitHub Advisories e OpenSourceMalware.

### GET /v1/threat-intel/packages?page=1&pageSize=20&ecosystem=npm

Lista pacotes comprometidos conhecidos (paginado). Filtro opcional: `ecosystem`.

### GET /v1/threat-intel/check

Query params: `reportType`, `resourceIdentifier`, `ecosystem?`, `version?`

Exemplo: `?reportType=package&resourceIdentifier=durabletask&ecosystem=pypi&version=1.4.1`

---

## Health

### GET /health

```json
{ "status": "ok" }
```

Sem autenticação.
