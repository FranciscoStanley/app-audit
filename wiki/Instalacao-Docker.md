# Instalação com Docker

Guia detalhado para instalação via **Docker Compose** — método recomendado para produção e homologação.

---

## Arquitetura Docker

| Container | Imagem | Porta | Função |
|-----------|--------|-------|--------|
| `frontend` | `app-audit-frontend` | 3001 | UI Next.js |
| `backend` | `app-audit-backend` | 3000 | API NestJS |

Volume persistente: **`app-audit-data`** → montado em `BackEnd/data/`

---

## Instalação

### 1. Preparar ambiente

```bash
git clone https://github.com/FranciscoStanley/app-audit.git
cd app-audit
cp .env.docker.example .env
```

### 2. Variáveis essenciais

```env
# Segurança
JWT_SECRET=<openssl rand -base64 48>
NODE_ENV=production

# Admin (primeiro boot)
ADMIN_EMAIL=admin@empresa.com
ADMIN_PASSWORD=<senha-forte-12+>
ADMIN_NAME=Administrador

# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# CORS (produção)
CORS_ORIGIN=https://audit.seudominio.com
FRONTEND_URL=https://audit.seudominio.com

# Swagger (desabilitar em prod)
SWAGGER_ENABLED=false
```

### 3. Build e start

```bash
docker compose up -d --build
```

### 4. Comandos úteis

```bash
npm run docker:up       # up + build
npm run docker:stop     # stop
npm run docker:restart  # rebuild completo
npm run docker:logs     # logs em tempo real
npm run docker:down     # parar e remover containers
```

---

## Após alterações no código

```bash
docker compose stop
docker compose up -d --build
```

---

## Volume de dados

O volume `app-audit-data` persiste:

| Arquivo/Pasta | Conteúdo |
|---------------|----------|
| `users.json` | Usuários e hashes de senha |
| `consents.json` | Registros LGPD |
| `github-connections.json` | Tokens OAuth cifrados |
| `audits/{id}/` | Relatórios e findings |
| `jobs/{id}/` | Fila de jobs assíncronos |
| `threat-intel-cache.json` | Cache de threat intel |

> **Importante:** Faça backup regular do volume. Veja [Operações](Operacoes).

---

## Remediação no Docker

A imagem `backend` inclui:

- `git` — clone de repositórios
- `gh` — GitHub CLI para PRs e Dependabot
- `pnpm` / `npm` — regeneração de lockfiles
- `python3-pip` — requirements.txt

Certifique-se de que `GITHUB_TOKEN` tem escopos `repo` e `security_events`.

---

## Health checks

Docker Compose expõe probes nativos:

| Endpoint | Tipo | Uso |
|----------|------|-----|
| `/health` | Liveness | Container vivo |
| `/health/ready` | Readiness | Pronto para tráfego |

---

## Reverse proxy (produção)

Recomenda-se **HTTPS** via nginx, Caddy ou Cloudflare Tunnel:

```
Internet → HTTPS → Reverse Proxy → :3001 (frontend)
                                 → :3000 (API, se exposta)
```

Exemplo Caddy:

```
audit.seudominio.com {
    reverse_proxy localhost:3001
}

api.seudominio.com {
    reverse_proxy localhost:3000
}
```

Atualize `CORS_ORIGIN`, `FRONTEND_URL` e callback OAuth para os domínios finais.

---

## Imagens GHCR

Releases publicam imagens em:

```
ghcr.io/franciscostanley/app-audit-backend:v1.1.0
ghcr.io/franciscostanley/app-audit-frontend:v1.1.0
```

---

## Próximos passos

- [Deploy em Produção](Deploy-Producao) — checklist completo
- [Oracle Cloud (Free)](Oracle-Cloud) — deploy gratuito em VM
- [Operações](Operacoes) — backup e monitoramento
