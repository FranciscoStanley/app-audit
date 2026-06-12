# Deploy em Produção

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` com 32+ caracteres (`openssl rand -base64 48`)
- [ ] `GITHUB_TOKEN` com escopos `repo` e `security_events` (remediação Dependabot)
- [ ] `CORS_ORIGIN` com URL exata do frontend (sem `*`)
- [ ] `ADMIN_EMAIL` + `ADMIN_PASSWORD` (12+ chars) ou `data/users.json` pré-populado
- [ ] `SWAGGER_ENABLED=false` (recomendado)
- [ ] HTTPS via reverse proxy (nginx, Caddy, Cloudflare)
- [ ] Volume persistente em `BackEnd/data/`
- [ ] `npm run security:scan` sem alertas antes do push
- [ ] Nenhum arquivo `.env` ou `data/` no repositório Git

## Criar administrador

### Opção A — variáveis de ambiente (primeiro boot)

```env
ADMIN_EMAIL=admin@empresa.com
ADMIN_PASSWORD=<defina-uma-senha-forte-12+>
ADMIN_NAME=Administrador
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

### Opção C — API (após primeiro admin existir)

`POST /auth/users` (admin autenticado)

## Oracle Cloud (Always Free)

Deploy gratuito em VM Ampere A1 com Docker Compose — guia completo passo a passo:

**[docs/deployment-oracle-cloud.md](./deployment-oracle-cloud.md)**

Arquivos: `docker-compose.oracle.yml`, `.env.oracle.example`, `scripts/oracle-cloud/`.

## Docker Compose

```bash
cp .env.docker.example .env
# Edite .env: JWT_SECRET, ADMIN_PASSWORD, GITHUB_TOKEN

npm run docker:up
# ou: docker compose up -d --build
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| API | http://localhost:3000 |
| Health | http://localhost:3000/health |

Comandos úteis:

```bash
npm run docker:logs    # acompanhar logs
npm run docker:down    # parar containers
```

O volume `app-audit-data` persiste `data/users.json` e relatórios de auditoria.

## Remediação em produção (Docker)

A imagem `backend` inclui `git`, `gh`, `pnpm` e `python3-pip` para remediação automática (clone, lockfile, PR).

- Configure `GITHUB_TOKEN` com permissão de escrita nos repositórios auditados
- OAuth do usuário também pode ser usado via conexão GitHub (fluxo login)
- Workspace temporário: `BackEnd/data/remediation-workspace/` (dentro do volume)

## Sem Docker

```bash
# BackEnd
cd BackEnd
npm ci
npm run build
NODE_ENV=production node dist/main.js

# Frontend
cd frontend
npm ci
npm run build
NODE_ENV=production npm run start
```

## O que mudou em relação ao modo demo

| Antes | Produção |
|-------|----------|
| Usuários fixos em memória | `data/users.json` persistente |
| Senhas demo no login | Formulário vazio, credenciais reais |
| JWT secret padrão | Obrigatório e validado |
| Swagger sempre ativo | Desabilitado em produção por padrão |
| Sem helmet | Headers de segurança via helmet |
