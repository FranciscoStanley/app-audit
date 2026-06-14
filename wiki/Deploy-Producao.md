# Deploy em Produção

Checklist e boas práticas para colocar o App Audit em ambiente de produção com segurança.

---

## Checklist pré-deploy

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` com 32+ caracteres (`openssl rand -base64 48`)
- [ ] `GITHUB_TOKEN` com escopos `repo` e `security_events`
- [ ] `CORS_ORIGIN` com URL exata do frontend (sem `*`)
- [ ] `ADMIN_EMAIL` + `ADMIN_PASSWORD` (12+ chars) ou `users.json` pré-populado
- [ ] `SWAGGER_ENABLED=false`
- [ ] HTTPS via reverse proxy (nginx, Caddy, Cloudflare)
- [ ] Volume persistente em `BackEnd/data/`
- [ ] Backup automatizado do volume
- [ ] Nenhum `.env` ou `data/` no repositório Git

---

## Criar administrador

### Opção A — variáveis de ambiente (primeiro boot)

```env
ADMIN_EMAIL=admin@empresa.com
ADMIN_PASSWORD=<senha-forte-12+>
ADMIN_NAME=Administrador
ADMIN_GITHUB_USERNAME=seu-usuario-github
```

### Opção B — CLI

```bash
cd BackEnd
npm run users:create -- \
  --email admin@empresa.com \
  --password "<senha-forte-12+>" \
  --name "Administrador" \
  --role admin
```

### Opção C — API (após admin existir)

`POST /v1/auth/users` com JWT de admin autenticado.

> **Não há credenciais fixas** — o primeiro admin é criado por uma das opções acima.

---

## Docker Compose (produção)

```bash
cp .env.docker.example .env
# Edite todas as variáveis sensíveis
docker compose up -d --build
```

Variáveis adicionais recomendadas:

```env
SWAGGER_ENABLED=false
CORS_ORIGIN=https://audit.seudominio.com
FRONTEND_URL=https://audit.seudominio.com
DATA_CONTROLLER_NAME=Sua Empresa Ltda
PRIVACY_CONTACT_EMAIL=privacidade@empresa.com
```

---

## HTTPS e reverse proxy

### nginx (exemplo)

```nginx
server {
    listen 443 ssl http2;
    server_name audit.seudominio.com;

    ssl_certificate     /etc/letsencrypt/live/audit/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/audit/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl http2;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_read_timeout 300s;
        proxy_set_header Host $host;
    }
}
```

---

## OAuth GitHub em produção

Atualize o OAuth App no GitHub:

| Campo | Valor produção |
|-------|----------------|
| Homepage URL | `https://audit.seudominio.com` |
| Callback URL | `https://api.seudominio.com/v1/auth/github/callback` |

Detalhes: [GitHub OAuth](GitHub-OAuth)

---

## Remediação em produção

Requisitos:

| Item | Detalhe |
|------|---------|
| Token GitHub | Escopos `repo` + `security_events` |
| Ferramentas no container | `git`, `gh`, `pnpm`/`npm` (inclusos na imagem) |
| Consentimento LGPD | Usuário deve aceitar antes da primeira remediação |
| Revisão humana | PRs automatizados exigem review antes de merge |

---

## Monitoramento

| Check | Endpoint | Alerta se |
|-------|----------|-----------|
| Liveness | `GET /health` | ≠ 200 por 2 min |
| Readiness | `GET /health/ready` | `status: error` por 5 min |
| Disco | volume `data/` | > 80% |
| Logs | stdout JSON | `level: error` recorrente |

Veja [Operações](Operacoes) para backup e releases.

---

## Imagens GHCR

Tags semver publicadas automaticamente:

```
ghcr.io/<owner>/app-audit-backend:v1.1.0
ghcr.io/<owner>/app-audit-frontend:v1.1.0
```

Workflow: `.github/workflows/release.yml` (trigger: tag `v*.*.*`)

---

## Próximos passos

- [Oracle Cloud (Free)](Oracle-Cloud) — deploy gratuito
- [Operações](Operacoes) — backup, logs, releases
- [Limitações v1](Limitacoes) — entender limites de escala
