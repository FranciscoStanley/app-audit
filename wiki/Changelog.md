# Changelog

Histórico de versões do App Audit. Formato baseado em [Keep a Changelog](https://keepachangelog.com/).

Documento completo: [CHANGELOG.md](https://github.com/FranciscoStanley/app-audit/blob/master/CHANGELOG.md)

---

## [1.1.0] — 2026-06-11

### Added

- API versionada com prefixo `/v1` (health em `/health` e `/health/ready`)
- Consentimento LGPD completo: login e-mail, OAuth GitHub e remediação automática
- Política de Privacidade e Termo de Uso profissionais (v1.1.0)
- Painel **Administração** (`/dashboard/admin`) — gestão de usuários RBAC
- Health readiness com checks de storage, JWT, GitHub e threat intel
- Logs HTTP estruturados (JSON) com `X-Request-Id`
- Persistência de cache de threat intel em `data/threat-intel-cache.json`
- CI completo (test, e2e, lint, build), release workflow e publish GHCR
- Dependabot, CODE_OF_CONDUCT, issue/PR templates
- Documentação: ROADMAP, LIMITATIONS, operations
- Jobs assíncronos para auditoria e remediação

### Changed

- OAuth callback URL: `/v1/auth/github/callback`
- Versão unificada do monorepo: **1.1.0**

### Security

- Remediação bloqueada sem consentimento registrado
- Login por e-mail exige aceite de Termos e Privacidade

[Comparar v1.0.0...v1.1.0](https://github.com/FranciscoStanley/app-audit/compare/v1.0.0...v1.1.0)

---

## [1.0.0] — 2026-06-01

### Added

- Plataforma inicial: auditoria Miasma, threat intel, remediação
- Docker Compose, JWT + RBAC
- Dashboard Next.js, relatórios PDF/MD
- Integração GitHub OAuth e gh CLI

[Release v1.0.0](https://github.com/FranciscoStanley/app-audit/releases/tag/v1.0.0)

---

## Versionamento

O projeto segue [Semantic Versioning](https://semver.org/):

| Tipo | Quando |
|------|--------|
| **MAJOR** | Breaking changes (ex: v2.0 PostgreSQL) |
| **MINOR** | Features compatíveis (ex: v1.2 Prometheus) |
| **PATCH** | Bug fixes |

---

## Próximos passos

- [Roadmap](Roadmap) — o que vem a seguir
- [Releases no GitHub](https://github.com/FranciscoStanley/app-audit/releases)
