# Referência da API

**Base URL:** `http://localhost:3000`  
**Swagger:** `http://localhost:3000/api/docs`  
**Autor:** Francisco Stanley Rodrigues Albuquerque

## Autenticação

Todas as rotas (exceto `/health`, `GET /auth/legal/info`, `GET /auth/login/consent`, `GET /auth/github/consent`, `POST /auth/login`, `POST /auth/github/consent/accept`, `POST /auth/github/exchange`, `GET /auth/github`, `GET /auth/github/callback`, `GET /auth/github/config`) exigem header:

```
Authorization: Bearer <accessToken>
```

### POST /auth/login

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

### GET /auth/legal/info

Informações legais públicas (versão de política, URLs, contatos).

### GET /auth/login/consent

Finalidades e base legal do login por e-mail.

### GET /auth/github/consent

Informações de consentimento LGPD para OAuth GitHub (escopos, terceiros, direitos do titular).

### POST /auth/github/consent/accept

Registra aceite e retorna `authorizeUrl` para redirect ao GitHub.

### GET /auth/github/config

```json
{ "enabled": true }
```

### GET /auth/github

Redireciona ao GitHub OAuth (`read:user`, `user:email`, `repo`).

### GET /auth/github/callback

Callback OAuth — redireciona ao frontend com `?code=<código-de-uso-único>` (válido por 2 minutos).

### POST /auth/github/exchange

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

### GET /auth/github/status

**Auth:** JWT

```json
{
  "enabled": true,
  "connected": true,
  "githubUsername": "usuario",
  "connectedAt": "2026-06-10T12:00:00.000Z"
}
```

### GET /auth/me

Retorna o perfil do usuário autenticado (inclui `githubConnected`, `githubUsername`).

### POST /auth/users

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

### POST /audit/run?save=true

Executa auditoria completa de todos os repositórios GitHub da conta autenticada no `gh`.

**Permissão:** `audit:run`

```json
// Response 200
{
  "report": { "auditedAt": "...", "verdict": "not_affected", ... },
  "savedTo": "docs/security/miasma-worm-audit-report.md",
  "auditId": "uuid"
}
```

### GET /audit/reports

Lista relatórios armazenados.

### GET /audit/reports/:id

Retorna relatório completo por ID.

### GET /audit/reports/:id/markdown

Download do relatório consolidado em Markdown.

### GET /audit/reports/:id/pdf

Download do relatório consolidado em PDF.

### GET /audit/reports/:id/findings

Lista todas as vulnerabilidades do relatório.

### GET /audit/reports/:id/findings/:findingId/markdown

Download do relatório individual da vulnerabilidade (Markdown).

### GET /audit/reports/:id/findings/:findingId/pdf

Download do relatório individual da vulnerabilidade (PDF).

---

## Remediação

Remediação **100% automática** via Git workspace + GitHub API:

- Clone shallow do repositório, alterações locais, **regeneração de lockfile** (pnpm/npm/yarn/pip)
- Commit único por vulnerabilidade
- Push direto ao branch padrão ou **Pull Request automático** se branch protegida
- Alertas Dependabot fechados após atualizar manifesto + lockfile

### GET /audit/remediation/consent

**Auth:** JWT · Permissão: `remediation:preview`

Retorna status e informações do consentimento LGPD para remediação automática (`accepted: true|false`).

### POST /audit/remediation/consent/accept

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

### GET /audit/remediation/:findingId/preview

Retorna plano de remediação para a vulnerabilidade (todos os passos marcados como automatizados).

### POST /audit/remediation/:findingId/apply

Aplica todos os passos automaticamente no repositório GitHub. **Exige consentimento de remediação registrado** (v1.1.0+). Requer token com escopo `repo` e `security_events` (Dependabot).

### POST /audit/reports/:id/remediate-all

Aplica remediação automática em **todas** as vulnerabilidades remediativas do relatório (ex.: 47 alertas Dependabot).

Resposta: `{ total, succeeded, failed, results[] }`

---

## Threat Intelligence

### GET /threat-intel/status

Status da base local de threat intel.

### POST /threat-intel/sync

Força sincronização com GitHub Advisories e OpenSourceMalware.

### GET /threat-intel/packages?ecosystem=npm

Lista pacotes comprometidos conhecidos.

### GET /threat-intel/check

Query params: `reportType`, `resourceIdentifier`, `ecosystem?`, `version?`

Exemplo: `?reportType=package&resourceIdentifier=durabletask&ecosystem=pypi&version=1.4.1`

---

## Health

### GET /health

```json
{ "status": "ok" }
```

Sem autenticação.
