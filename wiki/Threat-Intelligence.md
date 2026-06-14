# Threat Intelligence

Sincronização com bases de inteligência de ameaças para enriquecer auditorias com pacotes maliciosos, advisories e repositórios comprometidos conhecidos.

---

## Fontes de dados

| Fonte | Descrição | Token |
|-------|-----------|-------|
| **GitHub Advisory Database** | CVEs e advisories de pacotes | `GITHUB_TOKEN` |
| **OpenSourceMalware (OSM)** | Pacotes e repos maliciosos | `OSM_API_TOKEN` (opcional) |
| **Baseline Miasma** | Indicadores embutidos no código | — |

---

## Sync manual

### Via UI

1. Acesse **Threat Intelligence**
2. Clique **Sincronizar**
3. A UI mantém estado em segundo plano via `background-tasks-store`

### Via API

```http
POST /v1/threat-intel/sync
Authorization: Bearer <token>
```

Permissão: `threat-intel:sync`

---

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/v1/threat-intel/status` | Status do cache e último sync |
| POST | `/v1/threat-intel/sync` | Sincronizar fontes |
| GET | `/v1/threat-intel/packages` | Pacotes monitorados |
| GET | `/v1/threat-intel/check` | Verificar pacote/repo |

---

## Cache persistente

Arquivo: `BackEnd/data/threat-intel-cache.json`

| Aspecto | Comportamento |
|---------|---------------|
| Sync incremental | Atualiza apenas entradas novas |
| Boot | Baseline Miasma sempre recarregado |
| Intervalo automático | `THREAT_INTEL_REFRESH_HOURS` (padrão: 6h) |
| Startup sync | `THREAT_INTEL_SYNC_ON_STARTUP=true` |

---

## Variáveis de ambiente

```env
GITHUB_TOKEN=ghp_xxxx                    # Obrigatório para GHSA
OSM_API_TOKEN=                           # Opcional
THREAT_INTEL_REFRESH_HOURS=6
THREAT_INTEL_SYNC_ON_STARTUP=true
GITHUB_ADVISORY_MAX_PAGES=10
```

---

## Integração com auditoria

Durante a varredura Miasma:

1. Dependências do repo são cross-referenced com cache
2. Pacotes OSM/GHSA matching geram findings
3. Repositórios baseline Miasma são verificados

---

## UI — Threat Intelligence

A tela exibe:

- Pacotes monitorados e fontes habilitadas
- Repositórios baseline Miasma
- Status do último sync
- Botão de sincronização manual

---

## Health check

`/health/ready` inclui check `threatIntel`:

- Verifica se último sync foi registrado
- Warn em dev se nunca sincronizado
- Fail em prod se sync crítico ausente

---

## Próximos passos

- [Auditoria](Auditoria) — usar intel na varredura
- [Arquitetura](Arquitetura) — adapters GHSA/OSM
- [Operações](Operacoes) — backup do cache
