# Contribuindo com o App Audit

Obrigado pelo interesse em contribuir. Este guia descreve o fluxo esperado para issues, pull requests e padrões de código do projeto.

**Autor / mantenedor:** Francisco Stanley Rodrigues Albuquerque

## Índice

- [Código de conduta](#código-de-conduta)
- [Como posso ajudar?](#como-posso-ajudar)
- [Ambiente de desenvolvimento](#ambiente-de-desenvolvimento)
- [Fluxo de trabalho](#fluxo-de-trabalho)
- [Padrões de código](#padrões-de-código)
- [Testes e qualidade](#testes-e-qualidade)
- [Documentação](#documentação)
- [Segurança](#segurança)

## Código de conduta

Este projeto adota um ambiente colaborativo, respeitoso e inclusivo. Comportamentos inadequados, assédio ou discriminação não serão tolerados. Mantenedores podem remover contribuições ou participantes que violem estas expectativas.

## Como posso ajudar?

| Tipo | Quando usar |
|------|-------------|
| **Bug report** | Comportamento incorreto, regressão ou falha reproduzível |
| **Feature request** | Nova funcionalidade ou melhoria de produto |
| **Pull request** | Correção, feature, testes ou documentação |

Antes de abrir uma issue, verifique se já existe discussão similar em [Issues](https://github.com/FranciscoStanley/app-audit/issues).

### Bug reports

Inclua sempre:

1. **Descrição** — o que aconteceu vs. o esperado
2. **Passos para reproduzir** — comandos, rotas ou telas envolvidas
3. **Ambiente** — SO, Node.js, Docker ou local
4. **Logs** — trechos relevantes (sem secrets, tokens ou `.env`)

### Feature requests

Descreva o problema que a feature resolve, o comportamento proposto e, se possível, alternativas consideradas.

## Ambiente de desenvolvimento

### Pré-requisitos

- Node.js 20+
- npm 10+
- [GitHub CLI](https://cli.github.com/) (`gh auth login`) — recomendado para auditorias locais
- Docker (opcional) — stack completa via `docker compose`

### Setup

```bash
git clone https://github.com/FranciscoStanley/app-audit.git
cd app-audit
npm install
cd BackEnd && npm run setup && cd ..
# Configure ADMIN_EMAIL e ADMIN_PASSWORD em BackEnd/.env
npm run dev
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| API | http://localhost:3000 |
| Swagger (dev) | http://localhost:3000/api/docs |

Guia completo: [docs/development.md](./docs/development.md)

## Fluxo de trabalho

1. **Fork** o repositório (contribuidores externos) ou crie uma branch a partir de `master`
2. **Branch** com nome descritivo:
   - `feat/nome-da-feature`
   - `fix/descricao-do-bug`
   - `docs/assunto`
   - `refactor/modulo`
3. **Commits** seguindo [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` nova funcionalidade
   - `fix:` correção de bug
   - `docs:` documentação
   - `test:` testes
   - `refactor:` refatoração sem mudança de comportamento
   - `chore:` manutenção (deps, CI, scripts)
4. **Testes** — `npm test` deve passar antes do PR
5. **Pull request** — descreva o *porquê*, liste mudanças e inclua plano de teste

### Checklist do PR

- [ ] `npm test` passou localmente
- [ ] `npm run security:scan` passou (sem secrets versionados)
- [ ] Swagger / `docs/api.md` atualizados se endpoints mudaram
- [ ] Testes adicionados ou ajustados para o comportamento alterado
- [ ] Nenhum `.env`, `data/` ou credencial incluída no commit

## Padrões de código

O monorepo segue **Clean Architecture** no BackEnd e **App Router** no frontend.

| Área | Convenção |
|------|-----------|
| BackEnd | `domain/` → `application/` → `infrastructure/` → `presentation/` |
| NestJS | Controllers finos; lógica em use cases |
| Frontend | Componentes em `src/components/`; API client em `src/lib/` |
| RBAC | Todas as rotas protegidas devem respeitar papéis existentes |
| Idioma | Código e identificadores em inglês; docs do projeto em português |

Consulte `.cursor/skills/` para workflows detalhados (backend, frontend, auth, scanners).

## Testes e qualidade

```bash
npm test                 # BackEnd + frontend
npm run security:scan    # varredura de secrets nos arquivos versionados
npm run build            # build completo
```

CI executa em cada push/PR:

- Gitleaks (secret scanning)
- `npm audit` (dependências)
- Script local de padrões de secrets

## Documentação

Ao alterar funcionalidade, atualize o que for impactado:

| Mudança | Atualizar |
|---------|-----------|
| Endpoint / DTO / RBAC | Swagger, `docs/api.md`, collections Postman/Insomnia |
| Use case / scanner | Testes unitários, `docs/technical.md` |
| UI / fluxo | `docs/screenshots.md` (se visual mudou) |
| Deploy / env | `docs/deployment.md`, `.env*.example` |

Índice geral: [docs/README.md](./docs/README.md)

## Segurança

**Não abra issues públicas para vulnerabilidades de segurança.**

Consulte [SECURITY.md](./SECURITY.md) para reporte responsável, versões suportadas e boas práticas de deploy.

---

Dúvidas sobre contribuição? Abra uma [issue](https://github.com/FranciscoStanley/app-audit/issues) com a label sugerida ou mencione `@FranciscoStanley` no PR.
