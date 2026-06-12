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
| Jobs assíncronos | `data/jobs/{id}/job.json` | Varredura e remediação em fila local |

**Não use NFS compartilhado entre múltiplos backends sem lock externo.**

## Jobs assíncronos (v1.2+)

Varreduras e remediações são enfileiradas via `POST /v1/audit/jobs/*`. O frontend faz polling em `GET /v1/audit/jobs/:id`.

- **Single-node:** um processador in-process por instância; fila FIFO em disco
- **Reinício:** jobs `running` são marcados como `failed` (não retomados automaticamente)
- **UI:** banner global + sidebar; estado sobrevive navegação e recarga (jobs via polling no servidor; Threat Intel sync via store Zustand persistido)

Endpoints síncronos (`POST /audit/run`, etc.) permanecem para CLI e compatibilidade.

## Auditorias síncronas (legado)

`POST /v1/audit/run` ainda executa varredura completa na requisição HTTP. Repositórios muitos ou grandes podem:

- Exceder timeout de proxy (nginx, Cloudflare)
- Bloquear worker Node por longos períodos

**Mitigação v1:** usar `POST /v1/audit/jobs/audit-run` + polling; **v2:** fila distribuída (BullMQ/Redis).

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
