# Desenvolvimento Local

Guia para executar o App Audit **sem Docker**, ideal para contribuição e debug.

---

## Pré-requisitos

| Ferramenta | Versão |
|------------|--------|
| Node.js | 20+ |
| npm | 10+ |
| GitHub CLI (`gh`) | autenticado: `gh auth login` |

> **Windows:** use `;` em vez de `&&` no PowerShell antigo, ou execute comandos separados.

---

## Setup inicial

```bash
git clone https://github.com/FranciscoStanley/app-audit.git
cd app-audit
npm install
cd BackEnd
npm run setup
cd ..
```

O comando `setup`:

1. Cria `BackEnd/.env` a partir do exemplo
2. Tenta obter `GITHUB_TOKEN` do `gh auth token`

### Configurar administrador

Edite `BackEnd/.env`:

```env
ADMIN_EMAIL=admin@empresa.com
ADMIN_PASSWORD=SenhaForte12+
ADMIN_NAME=Administrador
JWT_SECRET=dev-secret-minimo-32-caracteres-aqui
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

Ou via CLI:

```bash
cd BackEnd
npm run users:create -- \
  --email admin@empresa.com \
  --password "SenhaForte12+" \
  --name "Administrador" \
  --role admin
```

---

## Executar em modo dev

Na raiz do monorepo:

```bash
npm run dev
```

Isso inicia **backend** (`:3000`) e **frontend** (`:3001`) em paralelo via `concurrently`.

| Serviço | URL |
|---------|-----|
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |
| Frontend | http://localhost:3001 |

---

## Scripts úteis

```bash
npm run dev              # backend + frontend (watch)
npm run build            # build produção
npm test                 # Jest (BE) + Vitest (FE)
npm run test:e2e         # smoke E2E BackEnd
npm run lint             # ESLint monorepo
npm run audit:miasma -w BackEnd   # auditoria CLI
npm run docs:screenshots # capturas para documentação
```

---

## Estrutura do monorepo

```
app-audit/
├── BackEnd/                 # NestJS API :3000
│   ├── src/
│   │   ├── domain/          # entidades, ports, RBAC
│   │   ├── application/     # use cases
│   │   ├── infrastructure/  # adapters, scanners, storage
│   │   ├── presentation/    # controllers, DTOs
│   │   ├── auth/
│   │   ├── audit/
│   │   └── threat-intel/
│   └── data/                # persistência local (gitignored)
├── frontend/                # Next.js :3001
│   └── src/
│       ├── app/             # App Router
│       ├── components/
│       ├── lib/api.ts
│       └── stores/          # Zustand (auth, background-tasks)
└── docs/                    # documentação
```

---

## Adicionar novo tipo de vulnerabilidade

1. Tipo em `ThreatFindingType` (`repository-scan.entity.ts`)
2. Detecção em `AdditionalSecurityScanner` ou `MiasmaRepositoryScanner`
3. Categoria em `finding.factory.ts`
4. Plano de remediação em `RemediationUseCase.buildPlan()`
5. Testes + Swagger + `docs/api.md` + collections

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `GITHUB_TOKEN` vazio | `gh auth login` + `npm run setup` |
| Porta em uso | Altere `PORT` no `.env` |
| CORS | `CORS_ORIGIN=http://localhost:3001` |
| node_modules na raiz | Comportamento normal do npm workspaces (hoisting) |

---

## Próximos passos

- [Clean Architecture](Clean-Architecture) — camadas do BackEnd
- [Contribuindo](Contribuindo) — padrões de PR
- [Referência da API](API) — contratos HTTP
