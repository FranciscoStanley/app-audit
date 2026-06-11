# Roadmap — App Audit

**Autor:** Francisco Stanley Rodrigues Albuquerque

## v1.1.x (atual) — OSS profissional

- [x] CI/CD (test, build, lint, e2e smoke)
- [x] Releases semver + GHCR
- [x] API `/v1`
- [x] LGPD (3 fluxos de consentimento)
- [x] Admin UI
- [x] Health readiness + logs estruturados
- [x] Threat intel cache persistente

## v1.2.x — Observabilidade e qualidade

- [ ] Métricas Prometheus (`/metrics`)
- [ ] OpenAPI exportado no CI (`docs/openapi.json`)
- [ ] CodeQL + Trivy no pipeline
- [ ] Cobertura mínima de testes (auth, audit controller)
- [ ] E2E Playwright (login → dashboard)

## v1.3.x — Operação enterprise-lite

- [ ] Backup/restore automatizado do volume `data/`
- [ ] Edição/remoção de usuários no admin UI
- [ ] Audit log de ações administrativas
- [ ] i18n EN (next-intl)

## v2.0.x — Escala (breaking)

- [ ] PostgreSQL + migrations (users, audits, consents)
- [ ] Fila de jobs para auditorias longas (BullMQ/Redis)
- [ ] Multi-instância com storage compartilhado
- [ ] Isolamento por organização (multi-tenant)

## Fora de escopo (v1)

- SaaS hospedado pelo mantenedor
- Billing / planos comerciais
- Scanner de runtime (DAST) em produção

Consulte [docs/LIMITATIONS.md](./docs/LIMITATIONS.md) para limites arquiteturais atuais.
