# Documentação — App Audit

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Índice

| Documento | Descrição |
|-----------|-----------|
| [Telas da aplicação](./screenshots.md) | Screenshots das interfaces |
| [Arquitetura](./architecture.md) | Diagramas Mermaid, camadas, fluxos |
| [Documentação técnica](./technical.md) | Stack, env vars, endpoints, monorepo |
| [Referência da API](./api.md) | Contratos HTTP detalhados |
| [Guia de desenvolvimento](./development.md) | Setup, estrutura, troubleshooting |
| [Deploy produção](./deployment.md) | Docker, checklist, usuários |
| [GitHub OAuth](./github-oauth-setup.md) | Login com GitHub (app 3659122) |
| [Collections](./collections/) | Postman e Insomnia |

## Collections API

### Postman

1. Abra Postman → **Import**
2. Selecione `docs/collections/postman/App-Audit.postman_collection.json`
3. Execute **Auth > Login** — o token é salvo em `accessToken`

### Insomnia

1. **Application** → **Preferences** → **Data** → **Import Data**
2. Selecione `docs/collections/insomnia/App-Audit.insomnia_collection.json`
3. Após login, copie `accessToken` da resposta para o environment

## Relatórios de auditoria

Relatórios gerados ficam em `BackEnd/docs/security/` e `BackEnd/data/audits/`.
