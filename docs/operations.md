# Operações — App Audit

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Health checks

| Endpoint | Uso | Resposta |
|----------|-----|----------|
| `GET /health` | Liveness (Docker/K8s) | `{ status: 'ok' }` |
| `GET /health/ready` | Readiness | `{ status, checks, version }` |

Checks em `/health/ready`:

- **storage** — diretório `data/` gravável
- **jwt** — `JWT_SECRET` presente e ≥ 32 chars
- **github** — `GITHUB_TOKEN` (warn em dev, fail em prod)
- **threatIntel** — último sync registrado

## Logs

Requisições HTTP geram logs JSON no stdout:

```json
{"level":"info","requestId":"…","method":"GET","path":"/v1/auth/me","statusCode":200,"durationMs":12}
```

Use agregador (Loki, CloudWatch, Datadog) no deploy. Header de resposta: `X-Request-Id`.

## Backup do volume `data/`

```bash
# Docker
docker run --rm -v app-audit-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/app-audit-data-$(date +%Y%m%d).tar.gz -C /data .

# Restore (pare o backend antes)
docker compose stop backend
docker run --rm -v app-audit-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/app-audit-data-YYYYMMDD.tar.gz -C /data
docker compose up -d backend
```

Conteúdo crítico: `users.json`, `github-connections.json`, `consents.json`, `audits/`, `threat-intel-cache.json`.

## Releases

1. Atualize `CHANGELOG.md`
2. Tag semver: `git tag v1.1.0 && git push origin v1.1.0`
3. Workflow `.github/workflows/release.yml` publica GitHub Release e imagens GHCR

Imagens:

- `ghcr.io/<owner>/app-audit-backend:v1.1.0`
- `ghcr.io/<owner>/app-audit-frontend:v1.1.0`

## Monitoramento recomendado

- Alerta se `/health/ready` retorna `status: error` ou `degraded` por > 5 min
- Alerta se disco do volume `data/` > 80%
- Rotação de logs do container

## Rotação de secrets

| Secret | Ação |
|--------|------|
| `JWT_SECRET` | Invalida sessões; usuários fazem login novamente |
| `GITHUB_TOKEN` | Regenerar no GitHub; reiniciar backend |
| OAuth client secret | Regenerar no GitHub OAuth App; atualizar `.env` |

Após rotação, usuários podem precisar **desconectar e reconectar GitHub**.
