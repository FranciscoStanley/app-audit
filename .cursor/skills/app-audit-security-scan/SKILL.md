---
name: app-audit-security-scan
description: >-
  Scanners de segurança do app-audit — Miasma, secrets, dependências, CI/CD.
  Use ao adicionar novos indicadores ou categorias de vulnerabilidade.
---

# App Audit — Security Scanning

## Scanners

1. **MiasmaRepositoryScanner** — malware IDE hooks, Miasma, OSM
2. **AdditionalSecurityScanner** — secrets, unpinned actions, GHSA
3. **ComprehensiveSecurityScanner** — orquestrador

## Categorias de finding

- Malware Indicators
- Secrets Exposure
- CI/CD Security
- Dependency Vulnerabilities
- Supply Chain

## Threat Intel

- GitHub Advisories `type=malware`
- OpenSourceMalware `check-malicious`
- Sync a cada 6h + antes de cada audit

## Relatórios por vulnerabilidade

Cada finding gera relatório individual em `data/audits/{auditId}/findings/{findingId}.md`:

- `GET /audit/reports/:id/findings` — listar
- `GET /audit/reports/:id/findings/:findingId/markdown` — download MD
- `GET /audit/reports/:id/findings/:findingId/pdf` — download PDF

## Remediação

`POST /audit/remediation/:findingId/apply` — plano por tipo de finding
