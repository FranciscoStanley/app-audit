# Operações

Guia operacional para manter o App Audit em produção — health checks, logs, backup e releases.

---

## Health checks

| Endpoint | Tipo | Resposta |
|----------|------|----------|
| `GET /health` | Liveness | `{ "status": "ok" }` |
| `GET /health/ready` | Readiness | `{ status, checks, version }` |

### Checks de readiness

| Check | Valida |
|-------|--------|
| `storage` | Diretório `data/` gravável |
| `jwt` | `JWT_SECRET` presente e ≥ 32 chars |
| `github` | `GITHUB_TOKEN` configurado |
| `threatIntel` | Último sync registrado |

Exemplo:

```json
{
  "status": "ok",
  "checks": {
    "storage": "ok",
    "jwt": "ok",
    "github": "ok",
    "threatIntel": "ok"
  },
  "version": "1.1.0"
}
```

---

## Logs

Requisições HTTP geram logs JSON no stdout:

```json
{
  "level": "info",
  "requestId": "abc-123-def",
  "method": "GET",
  "path": "/v1/auth/me",
  "statusCode": 200,
  "durationMs": 12
}
```

| Recurso | Detalhe |
|---------|---------|
| Header | `X-Request-Id` em cada resposta |
| Agregador | Loki, CloudWatch, Datadog, etc. |
| Docker | `docker compose logs -f backend` |

---

## Backup do volume `data/`

### Criar backup

```bash
docker run --rm \
  -v app-audit-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/app-audit-data-$(date +%Y%m%d).tar.gz -C /data .
```

### Restaurar

```bash
docker compose stop backend
docker run --rm \
  -v app-audit-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/app-audit-data-YYYYMMDD.tar.gz -C /data
docker compose up -d backend
```

### Conteúdo crítico

| Arquivo/Pasta | Importância |
|---------------|-------------|
| `users.json` | Contas e senhas |
| `github-connections.json` | Tokens OAuth cifrados |
| `consents.json` | Registros LGPD |
| `audits/` | Relatórios históricos |
| `threat-intel-cache.json` | Cache de intel |
| `jobs/` | Fila de jobs |

---

## Releases

### Processo

1. Atualize `CHANGELOG.md`
2. Crie tag semver:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
3. Workflow `.github/workflows/release.yml` publica:
   - GitHub Release
   - Imagens GHCR

### Imagens Docker

```
ghcr.io/<owner>/app-audit-backend:v1.1.0
ghcr.io/<owner>/app-audit-frontend:v1.1.0
```

---

## Monitoramento recomendado

| Alerta | Condição |
|--------|----------|
| Readiness down | `/health/ready` ≠ ok por > 5 min |
| Disco cheio | Volume `data/` > 80% |
| Erros HTTP | Spike de `level: error` nos logs |
| Job failures | Jobs `failed` consecutivos |

---

## Manutenção

| Tarefa | Frequência |
|--------|------------|
| Backup do volume | Diário/semanal |
| Rotação de logs | Contínua (Docker) |
| Atualização de versão | Conforme releases |
| Rotação `GITHUB_TOKEN` | Trimestral |
| Sync threat intel | Automático (6h) ou manual |

---

## Troubleshooting operacional

| Sintoma | Ação |
|---------|------|
| Readiness `degraded` | Verificar token GitHub e sync threat intel |
| Disco crescente | Limpar auditorias antigas ou expandir volume |
| Jobs stuck | Reiniciar backend; jobs `running` → `failed` |
| 502 no proxy | Aumentar `proxy_read_timeout` para jobs síncronos |

---

## Próximos passos

- [Deploy em Produção](Deploy-Producao) — checklist
- [Limitações v1](Limitacoes) — escala single-node
- [Segurança](Seguranca) — hardening
