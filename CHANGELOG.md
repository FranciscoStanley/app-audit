# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-11

### Added

- API versionada com prefixo `/v1` (health em `/health` e `/health/ready`)
- Consentimento LGPD completo: login e-mail, OAuth GitHub e remediação automática
- Política de Privacidade e Termo de Uso profissionais (v1.1.0)
- Painel **Administração** (`/dashboard/admin`) — gestão de usuários RBAC
- Health readiness (`GET /health/ready`) com checks de storage, JWT, GitHub e threat intel
- Logs HTTP estruturados (JSON) com `X-Request-Id`
- Persistência de cache de threat intel em `data/threat-intel-cache.json`
- CI completo (test, e2e, lint, build), release workflow e publish GHCR
- Dependabot, CODE_OF_CONDUCT, issue/PR templates
- Documentação: `ROADMAP.md`, `docs/LIMITATIONS.md`, `docs/operations.md`

### Changed

- OAuth callback URL: `/v1/auth/github/callback`
- Versão unificada do monorepo: **1.1.0**
- Contato LGPD/DPO: franciscothestanley@gmail.com

### Security

- Remediação bloqueada sem consentimento registrado
- Login por e-mail exige aceite de Termos e Privacidade

## [1.0.0] - 2026-06-01

### Added

- Plataforma inicial: auditoria Miasma, threat intel, remediação, Docker, JWT + RBAC

[1.1.0]: https://github.com/FranciscoStanley/app-audit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/FranciscoStanley/app-audit/releases/tag/v1.0.0
