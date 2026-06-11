# Limitações conhecidas — App Audit

**Versão:** 1.1.0 · **Autor:** Francisco Stanley Rodrigues Albuquerque

Este documento descreve limites arquiteturais **honestos** do App Audit v1. Use-o para decidir se o produto atende seu cenário de deploy.

## Single-node

O App Audit v1 foi projetado como **appliance single-tenant** (uma instância Docker ou VM). Não há suporte a:

- Múltiplas réplicas do backend compartilhando estado
- Load balancer com sessões distribuídas (JWT stateless ok, mas `data/` não é compartilhado)

## Persistência em arquivos

| Dado | Local | Implicação |
|------|-------|------------|
| Usuários | `data/users.json` | Sem transações; concorrência alta pode corromper |
| Auditorias | `data/audits/{id}/` | Backup manual do volume |
| Consentimentos | `data/consents.json` | Audit trail local |
| Tokens OAuth | `data/github-connections.json` (cifrados) | Revogação por usuário |
| Threat intel cache | `data/threat-intel-cache.json` | Sync incremental persistido |

**Não use NFS compartilhado entre múltiplos backends sem lock externo.**

## Auditorias síncronas

`POST /v1/audit/run` executa varredura completa na requisição HTTP. Repositórios muitos ou grandes podem:

- Exceder timeout de proxy (nginx, Cloudflare)
- Bloquear worker Node por longos períodos

**Mitigação v1:** aumentar timeout do reverse proxy; **v2:** fila de jobs.

## Remediação

- Requer token GitHub com escopos adequados (`repo`, `security_events`)
- Alterações automatizadas exigem revisão humana antes de merge em produção
- Consentimento LGPD específico obrigatório

## OAuth GitHub

- Callback deve apontar para **`https://api.seudominio.com/v1/auth/github/callback`**
- Atualize o OAuth App no GitHub ao migrar para `/v1`

## Threat intelligence

- Baseline Miasma embutido no código
- Sync GHSA/OSM depende de `GITHUB_TOKEN` / `OSM_API_TOKEN`
- Cache persistido; baseline sempre recarregado no boot

## O que NÃO é garantido

- Detecção exaustiva de todas as vulnerabilidades
- Conformidade legal automática (LGPD exige operação correta do controlador)
- SLA de disponibilidade (self-hosted)

Para roadmap de mitigação, veja [ROADMAP.md](../ROADMAP.md).
