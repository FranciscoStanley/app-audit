---
name: change-sync-docs-tests
description: >-
  Garante que testes, Swagger e documentação sejam atualizados quando mudanças
  de funcionalidade os afetarem. Use SEMPRE ao adicionar, alterar ou remover
  features, endpoints, DTOs, scanners, auth, UI ou config de deploy.
---

# Change Sync — Testes, Swagger e Documentação

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Quando acionar

Acione esta skill **no início e no fim** de qualquer tarefa que toque:

- Controllers, DTOs, guards, use cases
- Scanners, entidades, ports
- Páginas/componentes do frontend
- Variáveis de ambiente, Docker, scripts npm
- Collections API ou fluxos de autenticação

## Matriz de impacto

| Tipo de mudança | Testes | Swagger | Documentação | Collections |
|-----------------|--------|---------|--------------|-------------|
| Novo endpoint | Sim | `@ApiOperation`, DTOs | `docs/api.md` | Postman + Insomnia |
| Endpoint removido/renomeado | Ajustar/remover | Remover decorators | `docs/api.md` | Atualizar paths |
| Novo campo em response | Sim se lógica | `@ApiProperty` no DTO | `docs/api.md` se contrato público | Body de exemplo |
| Nova permissão RBAC | `rbac.constants.spec.ts` | Bearer + descrição | `docs/technical.md`, auth skill | — |
| Novo tipo de finding | `*.spec.ts` do scanner | DTO de audit se exposto | `architecture.md`, security skill | — |
| Nova página UI | `*.test.ts` | — | `docs/development.md` se fluxo novo | — |
| Mudança em env | — | — | `.env.example`, `deployment.md` | Variáveis |
| Docker / compose | — | — | `deployment.md`, README | — |

## BackEnd — Swagger

Arquivos: `BackEnd/src/presentation/**/*.ts`, DTOs em `dto/`.

Checklist:

- [ ] `@ApiTags`, `@ApiOperation`, `@ApiResponse` no controller
- [ ] `@ApiProperty` / `@ApiPropertyOptional` em todos os campos do DTO
- [ ] `@ApiBearerAuth()` em rotas protegidas
- [ ] Query params com `@ApiQuery` quando aplicável
- [ ] Validar em `http://localhost:3000/api/docs` (ou build sem erro)

Swagger é gerado a partir dos decorators — **não** editar JSON manualmente.

## BackEnd — Testes (Jest)

Local: `BackEnd/src/**/*.spec.ts`

| Área | O que testar |
|------|----------------|
| Domain / constants | Regras puras (`rbac`, factories) |
| Generators | Formato do markdown/PDF output |
| Use cases | Mock de ports; cenários happy path + erro |
| Guards | Permissões por role (se houver spec) |

```bash
cd BackEnd && npm test
```

Crie ou atualize specs **no mesmo PR/commit lógico** da feature — não deixe para depois.

## Frontend — Testes (Vitest)

Local: `frontend/src/**/*.{test,spec}.{ts,tsx}`

Atualize quando mudar:

- `lib/utils.ts`, `lib/api.ts` — funções puras e client HTTP
- Componentes com lógica (auth, formatação, condicionais RBAC)
- Stores (Zustand) se regras de `can()` mudarem

```bash
cd frontend && npm test
```

## Documentação

| Arquivo | Atualizar quando |
|---------|------------------|
| `README.md` | Comandos, URLs, setup, visão geral |
| `docs/api.md` | Contratos HTTP, exemplos request/response |
| `docs/technical.md` | Stack, env vars, tabela de endpoints |
| `docs/architecture.md` | Novos módulos, fluxos, diagramas Mermaid |
| `docs/deployment.md` | Docker, produção, checklist |
| `docs/development.md` | Setup local, troubleshooting |
| `.cursor/skills/*.md` | Padrões ou workflows do domínio afetado |

**Não** criar docs não solicitados — apenas os impactados pela mudança.

## Collections API

Paths:

- `docs/collections/postman/App-Audit.postman_collection.json`
- `docs/collections/insomnia/App-Audit.insomnia_collection.json`

Ao mudar endpoints:

1. Adicionar/remover/renomear request na pasta correta (Auth, Audit, Threat Intel)
2. Manter variáveis `{{baseUrl}}`, `{{accessToken}}`, `{{auditId}}`, etc.
3. Atualizar body de exemplo se DTO mudou
4. Login: usar `{{adminEmail}}` / `{{adminPassword}}`, nunca credenciais fixas

## Workflow do agente

```
1. ANTES de codar — identificar na matriz o que será impactado
2. IMPLEMENTAR feature + testes + swagger + docs em conjunto
3. RODAR npm test na raiz (ou por workspace)
4. CHECKLIST final (abaixo)
5. Mencionar na resposta ao usuário o que foi sincronizado
```

## Checklist final (obrigatório)

- [ ] Testes adicionados/atualizados e passando
- [ ] Swagger/DTOs refletem o contrato atual
- [ ] `docs/api.md` atualizado se endpoint público mudou
- [ ] Collections Postman/Insomnia atualizadas se rota mudou
- [ ] README ou deployment atualizado se setup/deploy mudou
- [ ] Skill de domínio atualizada se padrão arquitetural mudou

## Comandos de verificação

```bash
# Monorepo completo
npm test

# Só BackEnd
npm run test -w BackEnd

# Só frontend
npm run test -w frontend

# Build produção (opcional, antes de release)
npm run build
```

## Exemplos

### Novo endpoint `GET /audit/reports/:id/summary`

1. Controller + DTO + `@ApiOperation`
2. Spec do use case ou store se houver lógica
3. `docs/api.md` — nova seção
4. Postman/Insomnia — novo request em Audit
5. `docs/technical.md` — linha na tabela de endpoints

### Novo botão no frontend sem API nova

1. Componente + teste Vitest se lógica relevante
2. Sem Swagger/docs API — a menos que UX mude fluxo documentado

### Nova variável `AUDIT_TIMEOUT_MS`

1. `BackEnd/.env.example` + `.env.docker.example`
2. `docs/technical.md` + `docs/deployment.md`
3. Sem teste obrigatório se só ConfigService — teste se houver validação em `env.validation.ts`

## Anti-padrões

- Deixar endpoint sem `@ApiProperty` no DTO
- Mudar rota sem atualizar collections
- Adicionar feature sem spec quando já existe padrão de teste na pasta
- Documentar credenciais demo ou secrets reais
- Atualizar só Swagger e esquecer `docs/api.md`
