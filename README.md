# App Audit

Plataforma de auditoria de segurança para repositórios GitHub — detecção de malware (Miasma), supply chain, secrets, CI/CD e dependências comprometidas.

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Arquitetura

```mermaid
flowchart TB
    subgraph Monorepo["app-audit/"]
        Root["package.json + node_modules hoisted"]
        BE["BackEnd :3000"]
        FE["frontend :3001"]
    end
    FE -->|JWT| BE
    BE --> Data["data/users.json + data/audits/"]
    BE --> GitHub["GitHub API / gh CLI"]
```

## Início rápido (desenvolvimento)

```bash
npm install
cd BackEnd
npm run setup          # gera .env com JWT_SECRET
# Configure ADMIN_EMAIL e ADMIN_PASSWORD no .env (mín. 12 caracteres)
# OU: npm run users:create -- --email ... --password ... --name ... --role admin
cd ..
npm run dev
```

| Serviço | URL |
|---------|-----|
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs (dev) |
| Frontend | http://localhost:3001 |

## Docker (produção local)

```bash
cp .env.docker.example .env
# Preencha JWT_SECRET, ADMIN_PASSWORD, GITHUB_TOKEN
npm run docker:up
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| API | http://localhost:3000 |

Detalhes: [docs/deployment.md](./docs/deployment.md)

## Usuários

Não há credenciais fixas. O primeiro administrador é criado via:

1. `ADMIN_EMAIL` + `ADMIN_PASSWORD` no `.env` (primeiro boot), ou
2. `npm run users:create` (CLI), ou
3. `POST /auth/users` (admin autenticado)

## Documentação

| Doc | Descrição |
|-----|-----------|
| [docs/README.md](./docs/README.md) | Índice |
| [docs/architecture.md](./docs/architecture.md) | Arquitetura (Mermaid) |
| [docs/technical.md](./docs/technical.md) | Referência técnica |
| [docs/deployment.md](./docs/deployment.md) | Deploy produção |
| [docs/api.md](./docs/api.md) | API HTTP |
| [docs/collections/](./docs/collections/) | Postman e Insomnia |

## Scripts

```bash
npm run dev              # backend + frontend
npm run build            # build completo
npm test                 # testes
npm run audit:miasma -w BackEnd
```
