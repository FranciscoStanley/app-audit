# Telas da aplicação

**Autor:** Francisco Stanley Rodrigues Albuquerque

Interface do App Audit — plataforma de auditoria de segurança para repositórios GitHub.

> As capturas abaixo usam dados de demonstração para ilustrar o fluxo da aplicação.

## Login

Tela de autenticação com login por email/senha e opção **Entrar com GitHub** (OAuth).

![Tela de login](./screenshots/01-login.png)

## Dashboard

Visão geral com métricas da última auditoria: repositórios, vulnerabilidades, pacotes monitorados e veredito.

![Dashboard](./screenshots/02-dashboard.png)

## Auditorias

Histórico de varreduras, status da conexão GitHub e botão para executar nova auditoria em todos os repositórios.

![Auditorias](./screenshots/03-auditorias.png)

## Detalhe da auditoria

Relatório consolidado em Markdown, download PDF e lista de vulnerabilidades por repositório.

![Detalhe da auditoria](./screenshots/04-detalhe-auditoria.png)

## Vulnerabilidades

Todas as categorias detectadas (Secrets, Supply Chain, CI/CD, etc.) com filtros por categoria.

![Vulnerabilidades](./screenshots/05-vulnerabilidades.png)

## Threat Intelligence

Status da sincronização com GitHub Advisories e OpenSourceMalware.

![Threat Intelligence](./screenshots/06-threat-intel.png)

## Atualizar capturas

Com o frontend rodando localmente:

```bash
npm run dev -w frontend
# Em outro terminal:
npm run docs:screenshots
```

Os arquivos PNG são gravados em `docs/screenshots/`.
