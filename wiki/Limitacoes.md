# Limitações v1

Limites arquiteturais **honestos** do App Audit v1.1. Use este documento para decidir se o produto atende seu cenário.

---

## Single-node

O App Audit v1 é um **appliance single-tenant** (uma instância Docker ou VM).

**Não suportado:**

- Múltiplas réplicas do backend compartilhando estado
- Load balancer com filas distribuídas
- Alta disponibilidade nativa

JWT é stateless, mas `data/` **não** é compartilhado entre instâncias.

---

## Persistência em arquivos

| Dado | Local | Implicação |
|------|-------|------------|
| Usuários | `data/users.json` | Sem transações ACID |
| Auditorias | `data/audits/{id}/` | Backup manual do volume |
| Consentimentos | `data/consents.json` | Audit trail local |
| Tokens OAuth | `data/github-connections.json` | Cifrados por usuário |
| Threat intel | `data/threat-intel-cache.json` | Sync incremental |
| Jobs | `data/jobs/{id}/job.json` | Fila local FIFO |

> **Não use NFS compartilhado** entre múltiplos backends sem lock externo.

---

## Jobs assíncronos

| Aspecto | Limitação |
|---------|-----------|
| Processador | In-process, single-node |
| Reinício | Jobs `running` → `failed` |
| Retomada | Não automática |
| Escala | Uma fila por instância |

**Mitigação v2:** BullMQ + Redis ([Roadmap](Roadmap)).

---

## Auditorias síncronas (legado)

`POST /v1/audit/run` executa na requisição HTTP — pode exceder timeouts.

**Mitigação:** usar `POST /v1/audit/jobs/audit-run` + polling.

---

## Remediação

| Requisito | Detalhe |
|-----------|---------|
| Token GitHub | Escopos `repo` + `security_events` |
| Revisão humana | PRs automatizados exigem review |
| Consentimento | LGPD obrigatório antes da primeira remediação |
| Branch protegida | Fallback para Pull Request |

---

## OAuth GitHub

- Callback: `https://api.seudominio.com/v1/auth/github/callback`
- Atualizar OAuth App ao migrar para `/v1`

---

## Threat Intelligence

- Baseline Miasma embutido no código
- Sync GHSA/OSM depende de tokens válidos
- Cache persistido; baseline recarregado no boot

---

## O que NÃO é garantido

| Item | Status |
|------|--------|
| Detecção exaustiva de todas vulnerabilidades | ❌ |
| Conformidade legal automática (LGPD) | ❌ — exige operação correta |
| SLA de disponibilidade | ❌ — self-hosted |
| Multi-tenant | ❌ — v2 roadmap |
| PostgreSQL | ❌ — v2 roadmap |

---

## Quando o App Audit v1 é adequado

✅ Equipe pequena/média com dezenas a centenas de repos  
✅ Deploy self-hosted em VM ou Docker  
✅ Single instância com backup do volume  
✅ DevSecOps com revisão humana de PRs  

## Quando considerar alternativas ou aguardar v2

❌ Múltiplas réplicas com load balancer  
❌ Milhares de repos com auditorias simultâneas  
❌ Multi-tenant SaaS  
❌ Banco relacional com audit log enterprise  

---

## Roadmap de mitigação

Consulte [Roadmap](Roadmap) para v1.2 (observabilidade), v1.3 (operações) e v2.0 (PostgreSQL, Redis, multi-tenant).
