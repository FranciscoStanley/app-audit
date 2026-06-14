# Roadmap

Evolução planejada do App Audit. Versão atual: **1.1.0**.

Documento completo: [ROADMAP.md](https://github.com/FranciscoStanley/app-audit/blob/master/ROADMAP.md)

---

## v1.1.x (atual) — OSS profissional ✅

- [x] CI/CD (test, build, lint, e2e smoke)
- [x] Releases semver + GHCR
- [x] API `/v1`
- [x] LGPD (3 fluxos de consentimento)
- [x] Admin UI
- [x] Health readiness + logs estruturados
- [x] Threat intel cache persistente
- [x] Jobs assíncronos (auditoria + remediação)

---

## v1.2.x — Observabilidade e qualidade

- [ ] Métricas Prometheus (`/metrics`)
- [ ] OpenAPI exportado no CI (`docs/openapi.json`)
- [ ] CodeQL + Trivy no pipeline
- [ ] Cobertura mínima de testes (auth, audit controller)
- [ ] E2E Playwright (login → dashboard)

---

## v1.3.x — Operação enterprise-lite

- [ ] Backup/restore automatizado do volume `data/`
- [ ] Edição/remoção de usuários no admin UI
- [ ] Audit log de ações administrativas
- [ ] i18n EN (next-intl)

---

## v2.0.x — Escala (breaking)

- [ ] PostgreSQL + migrations (users, audits, consents)
- [ ] Fila de jobs distribuída (BullMQ/Redis)
- [ ] Multi-instância com storage compartilhado
- [ ] Isolamento por organização (multi-tenant)

---

## Fora de escopo (v1)

| Item | Motivo |
|------|--------|
| SaaS hospedado | Self-hosted by design |
| Billing / planos | Sem modelo comercial |
| Scanner DAST runtime | Complexidade e escopo |

---

## Limitações atuais

Consulte [Limitações v1](Limitacoes) para entender o que v1 **não** suporta e como o roadmap endereça cada gap.

---

## Como influenciar o roadmap

1. Abra uma [Issue](https://github.com/FranciscoStanley/app-audit/issues) com label `enhancement`
2. Descreva o caso de uso e impacto
3. Referencie limitações de [Limitações v1](Limitacoes) se aplicável

---

## Próximos passos

- [Changelog](Changelog) — o que já foi entregue
- [Limitações v1](Limitacoes) — limites atuais
- [Contribuindo](Contribuindo) — participar do desenvolvimento
