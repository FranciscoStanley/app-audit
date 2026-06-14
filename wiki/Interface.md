# Interface do Usuário

Tour visual das principais telas do App Audit. Screenshots atualizados estão no repositório em `docs/screenshots/`.

---

## Login

Autenticação por **e-mail/senha** (com aceite de Termos e Privacidade no primeiro acesso) e **Entrar com GitHub** (OAuth).

![Login](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/01-login.png)

---

## Consentimento LGPD (GitHub OAuth)

Modal exibido antes do redirect ao GitHub: finalidades, permissões OAuth e direitos do titular.

![Consentimento LGPD](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/01b-consentimento-lgpd.png)

---

## Termo de Uso e Privacidade

Páginas legais públicas com conteúdo LGPD completo.

| Termo de Uso | Política de Privacidade |
|:---:|:---:|
| ![Termos](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/09-termos.png) | ![Privacidade](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/10-privacidade.png) |

---

## Dashboard

Card de conta GitHub conectada, métricas da última auditoria (repositórios, vulnerabilidades, pacotes monitorados, veredito) e atalhos para relatório.

![Dashboard](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/02-dashboard.png)

---

## Auditorias

Histórico paginado, status da conexão GitHub e **Nova auditoria**. Jobs continuam em segundo plano — banner e sidebar exibem progresso.

![Auditorias](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/03-auditorias.png)

---

## Detalhe da auditoria

Relatório Markdown, download PDF/MD e vulnerabilidades paginadas por repositório.

![Detalhe](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/04-detalhe-auditoria.png)

---

## Vulnerabilidades

Todas as categorias (Secrets, Supply Chain, CI/CD, Dependabot) com filtros, paginação e remediação em lote.

![Vulnerabilidades](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/05-vulnerabilidades.png)

---

## Remediação automática

Plano de remediação expandido, passos automatizados e botão **Aplicar correção**.

![Remediação](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/07-remediacao.png)

---

## Consentimento de remediação

Modal na primeira remediação: ações autorizadas, riscos e aceites LGPD.

![Consentimento remediação](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/11-remediacao-consentimento.png)

---

## Threat Intelligence

Sync com GitHub Advisories e OpenSourceMalware. Estado de sync em segundo plano.

![Threat Intel](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/06-threat-intel.png)

---

## Administração

Gestão de usuários RBAC — criar, editar (nome, papel, senha). Visível apenas para `admin`.

![Administração](https://raw.githubusercontent.com/FranciscoStanley/app-audit/master/docs/screenshots/08-administracao.png)

---

## Tarefas em segundo plano

| Componente | Função |
|------------|--------|
| **Banner global** | Progresso de auditoria/remediação |
| **Sidebar** | Indicador de jobs ativos |
| **Zustand persist** | Estado sobrevive navegação |

---

## Regenerar screenshots

```bash
docker compose up -d
npm run docs:screenshots
```

Requer frontend em `http://localhost:3001`.

---

## Stack frontend

| Tecnologia | Uso |
|------------|-----|
| Next.js 16 | App Router |
| Tailwind CSS 4 | Estilização |
| Zustand | Auth + background tasks |
| TypeScript | Tipagem |

---

## Próximos passos

- [Início Rápido](Inicio-Rapido) — subir a plataforma
- [Auditoria](Auditoria) — executar varredura
- [Autenticação & RBAC](Autenticacao-RBAC) — papéis
