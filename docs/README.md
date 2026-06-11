# Documentação — App Audit

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Documentação do repositório

| Arquivo | Descrição |
|---------|-----------|
| [../README.md](../README.md) | Visão geral e início rápido |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Guia de contribuição |
| [../LICENSE](../LICENSE) | Licença MIT |
| [../SECURITY.md](../SECURITY.md) | Política de segurança |

## Índice

| Documento | Descrição |
|-----------|-----------|
| [Telas da aplicação](./screenshots.md) | Screenshots das interfaces (abaixo) |
| [Arquitetura](./architecture.md) | Diagramas Mermaid, camadas, fluxos |
| [Documentação técnica](./technical.md) | Stack, env vars, endpoints, monorepo |
| [Referência da API](./api.md) | Contratos HTTP detalhados |
| [Guia de desenvolvimento](./development.md) | Setup, estrutura, troubleshooting |
| [Deploy produção](./deployment.md) | Docker, checklist, usuários |
| [GitHub OAuth](./github-oauth-setup.md) | Login com GitHub (app 3659122) |
| [Collections](./collections/) | Postman e Insomnia |

## Prévia das telas

| Login | Consentimento LGPD |
|-------|-------------------|
| ![Login](./screenshots/01-login.png) | ![Consentimento](./screenshots/01b-consentimento-lgpd.png) |

| Dashboard | Auditorias |
|-----------|------------|
| ![Dashboard](./screenshots/02-dashboard.png) | ![Auditorias](./screenshots/03-auditorias.png) |

| Detalhe da auditoria | Vulnerabilidades |
|----------------------|------------------|
| ![Detalhe](./screenshots/04-detalhe-auditoria.png) | ![Vulnerabilidades](./screenshots/05-vulnerabilidades.png) |

| Remediação automática | Threat Intelligence |
|-----------------------|---------------------|
| ![Remediação](./screenshots/07-remediacao.png) | ![Threat Intel](./screenshots/06-threat-intel.png) |

Detalhes e instruções para atualizar as capturas de tela: [screenshots.md](./screenshots.md).

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
