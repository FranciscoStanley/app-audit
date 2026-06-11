---
name: app-audit-backend
description: >-
  BackEnd NestJS do app-audit — JWT, RBAC, scanners de segurança, threat intel,
  PDF, remediação. Use ao modificar API, use cases ou adapters em BackEnd/.
---

# App Audit — BackEnd

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Stack

NestJS 11, Clean Architecture, Swagger, JWT, RBAC, gh CLI.

## Camadas

- `BackEnd/src/domain/` — entidades, ports, constants
- `BackEnd/src/application/` — use cases
- `BackEnd/src/infrastructure/` — adapters, scanners, storage
- `BackEnd/src/presentation/` — controllers, DTOs

## Comandos

```bash
cd BackEnd
npm run start:dev
npm run audit:miasma
npm test
```

## Ao alterar API

Siga `change-sync-docs-tests`: Swagger (decorators + DTOs), `docs/api.md`, collections, `*.spec.ts`.

## Jobs assíncronos

- Store: `infrastructure/storage/background-job.store.ts` → `data/jobs/{id}/`
- Processor: `infrastructure/jobs/background-job.processor.ts` (fila in-process)
- Use case: `application/use-cases/background-job.use-case.ts`
- Endpoints: `POST/GET /v1/audit/jobs/*` em `AuditController`

## Auth

- `POST /auth/login` — JWT
- Roles: `admin`, `auditor`, `viewer`
- Guards: `AuthGuard('jwt')` + `RolesGuard` + `@Permissions()`

## Scanners

- `ComprehensiveSecurityScanner` — orquestra Miasma + Additional
- Categorias: Malware, Secrets, CI/CD, Dependencies, Supply Chain
