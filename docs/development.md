# Guia de Desenvolvimento

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Screenshots da documentação

Para atualizar as imagens em `docs/screenshots/`:

```bash
docker compose up -d
npm run docs:screenshots
```

Ou com build local: `SCREENSHOT_BASE_URL=http://localhost:3002 npm run docs:screenshots` após `npm run build -w frontend`.

Ver [screenshots.md](./screenshots.md).

## Pré-requisitos

- Node.js 20+
- npm 10+
- [GitHub CLI](https://cli.github.com/) (`gh`) autenticado: `gh auth login`
- Windows: use `;` em vez de `&&` no PowerShell antigo, ou execute comandos separados

## Setup inicial

```bash
git clone <repo>
cd app-audit
npm install
cd BackEnd
npm run setup
# Edite .env: ADMIN_EMAIL, ADMIN_PASSWORD (mín. 12 caracteres)
# OU: npm run users:create -- --email x@empresa.com --password "..." --name "..." --role admin
cd ..
npm run dev
```

O comando `setup` cria `BackEnd/.env` e tenta obter `GITHUB_TOKEN` do `gh`.

## Estrutura de pastas

```
app-audit/
├── BackEnd/
│   ├── src/
│   │   ├── domain/           # entidades, ports, constants
│   │   ├── application/      # use cases
│   │   ├── infrastructure/   # adapters, scanners, storage
│   │   ├── presentation/     # controllers, DTOs
│   │   ├── auth/             # AuthModule
│   │   ├── audit/            # AuditModule
│   │   ├── threat-intel/     # ThreatIntelModule
│   │   └── cli/              # scripts CLI
│   ├── data/audits/          # relatórios persistidos (gitignored)
│   └── docs/security/        # relatórios exportados
├── frontend/
│   └── src/
│       ├── app/              # rotas Next.js
│       ├── components/       # UI e audit
│       ├── lib/              # api client
│       └── stores/           # Zustand
├── docs/                     # documentação do projeto
└── .cursor/                  # rules e skills Cursor
```

## Adicionar novo tipo de vulnerabilidade

1. Adicionar tipo em `ThreatFindingType` (`repository-scan.entity.ts`).
2. Implementar detecção em `AdditionalSecurityScanner` ou `MiasmaRepositoryScanner`.
3. Registrar categoria em `finding.factory.ts`.
4. Adicionar plano de remediação em `RemediationUseCase.buildPlan()`.
5. Adicionar recomendações em `VulnerabilityReportGenerator`.
6. Atualizar testes e documentação.

## Skills Cursor

Consulte `.cursor/skills/README.md` para workflows por área (backend, frontend, auth, security scan).

## Collections API

Importe as collections em `docs/collections/`:

- Postman: `App-Audit.postman_collection.json`
- Insomnia: `App-Audit.insomnia_collection.json`

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `EBUSY` no `npm install` | Feche processos Node; delete `node_modules` e reinstale |
| Rate limit GitHub | Configure `GITHUB_TOKEN` ou `gh auth login` |
| OSM desabilitado | Adicione `OSM_API_TOKEN` no `.env` |
| CORS bloqueado | Verifique `CORS_ORIGIN=http://localhost:3001` |
| PDF não gera | `md-to-pdf` usa Chromium; aguarde primeira execução |
