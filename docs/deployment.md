# Deploy em Produção

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` com 32+ caracteres (`openssl rand -base64 48`)
- [ ] `GITHUB_TOKEN` com escopos mínimos necessários
- [ ] `CORS_ORIGIN` com URL exata do frontend (sem `*`)
- [ ] `ADMIN_EMAIL` + `ADMIN_PASSWORD` (12+ chars) ou `data/users.json` pré-populado
- [ ] `SWAGGER_ENABLED=false` (recomendado)
- [ ] HTTPS via reverse proxy (nginx, Caddy, Cloudflare)
- [ ] Volume persistente em `BackEnd/data/`

## Criar administrador

### Opção A — variáveis de ambiente (primeiro boot)

```env
ADMIN_EMAIL=admin@empresa.com
ADMIN_PASSWORD=SenhaForteCom12+Chars
ADMIN_NAME=Administrador
```

### Opção B — CLI

```bash
cd BackEnd
npm run users:create -- \
  --email admin@empresa.com \
  --password "SenhaForteCom12+Chars" \
  --name "Administrador" \
  --role admin
```

### Opção C — API (após primeiro admin existir)

`POST /auth/users` (admin autenticado)

## Docker Compose

```bash
cp .env.production.example .env
# Edite .env com valores reais

docker compose up -d --build
```

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
