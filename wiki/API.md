# Referência da API

Contratos HTTP da API REST do App Audit.

**Base URL:** `http://localhost:3000`  
**Prefixo versionado:** `/v1` (exceto health)  
**Swagger (dev):** `http://localhost:3000/api/docs`

---

## Autenticação

Rotas protegidas exigem:

```
Authorization: Bearer <accessToken>
```

Obtenha o token via `POST /v1/auth/login` ou OAuth GitHub.

---

## Health (sem `/v1`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Liveness |
| GET | `/health/ready` | Readiness (storage, JWT, GitHub, threat intel) |

---

## Autenticação

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/auth/login` | — | Login e-mail/senha |
| GET | `/v1/auth/me` | JWT | Usuário atual |
| GET | `/v1/auth/users` | JWT admin | Listar usuários |
| POST | `/v1/auth/users` | JWT admin | Criar usuário |
| GET | `/v1/auth/legal/info` | — | Info legal pública |
| GET | `/v1/auth/github/consent` | — | Consentimento OAuth |
| POST | `/v1/auth/github/consent/accept` | — | Aceitar + authorizeUrl |
| GET | `/v1/auth/github/callback` | — | Callback OAuth |

### Login

```json
POST /v1/auth/login
{
  "email": "admin@empresa.com",
  "password": "sua-senha",
  "termsAccepted": true,
  "privacyAccepted": true
}
```

Resposta:

```json
{
  "accessToken": "eyJhbG...",
  "user": {
    "id": "...",
    "email": "admin@empresa.com",
    "name": "Administrador",
    "role": "admin"
  }
}
```

---

## Auditoria

| Método | Rota | Permissão |
|--------|------|-----------|
| POST | `/v1/audit/jobs/audit-run` | audit:run |
| GET | `/v1/audit/jobs/:id` | audit:read |
| GET | `/v1/audit/jobs?status=running` | audit:read |
| POST | `/v1/audit/run` | audit:run (síncrono) |
| GET | `/v1/audit/reports` | audit:read |
| GET | `/v1/audit/reports/:id` | audit:read |
| GET | `/v1/audit/reports/:id/markdown` | audit:download |
| GET | `/v1/audit/reports/:id/pdf` | audit:download |
| GET | `/v1/audit/reports/:id/findings` | audit:read |

---

## Remediação

| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/v1/audit/remediation/consent` | remediation:preview |
| POST | `/v1/audit/remediation/consent/accept` | remediation:apply |
| GET | `/v1/audit/remediation/:id/preview` | remediation:preview |
| POST | `/v1/audit/jobs/remediation` | remediation:apply |
| POST | `/v1/audit/jobs/remediation-all` | remediation:apply |
| POST | `/v1/audit/remediation/:id/apply` | remediation:apply |

---

## Threat Intelligence

| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/v1/threat-intel/status` | threat-intel:read |
| POST | `/v1/threat-intel/sync` | threat-intel:sync |
| GET | `/v1/threat-intel/packages` | threat-intel:read |
| GET | `/v1/threat-intel/check` | threat-intel:read |

---

## Códigos de resposta

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 202 | Job enfileirado (async) |
| 401 | Token ausente/inválido |
| 403 | Permissão insuficiente |
| 404 | Recurso não encontrado |
| 422 | Validação falhou |
| 500 | Erro interno |

---

## Logs

Requisições geram logs JSON com `X-Request-Id`:

```json
{
  "level": "info",
  "requestId": "abc-123",
  "method": "GET",
  "path": "/v1/auth/me",
  "statusCode": 200,
  "durationMs": 12
}
```

---

## Documentação completa

Referência detalhada com exemplos de request/response:

**[docs/api.md](https://github.com/FranciscoStanley/app-audit/blob/master/docs/api.md)**

Collections prontas: [Collections Postman/Insomnia](Collections)

---

## Próximos passos

- [Autenticação & RBAC](Autenticacao-RBAC) — papéis e permissões
- [Collections](Collections) — importar no Postman
- [Jobs Assíncronos](Jobs-Assincronos) — polling de status
