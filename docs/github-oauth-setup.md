# GitHub OAuth — app-audit

**App:** [settings/applications/3659122](https://github.com/settings/applications/3659122)  
**Autor:** Francisco Stanley Rodrigues Albuquerque

## Valores no GitHub (Developer Settings)

| Campo | Valor |
|-------|--------|
| Application name | `app-audit` |
| Homepage URL | `http://localhost:3001` |
| Authorization callback URL | `http://localhost:3000/v1/auth/github/callback` |
| Device Flow | Desabilitado (opcional) |

> A Homepage pode ser `http://localhost:3001` (frontend). O callback **deve** apontar para a API (`:3000`).

## Após registrar / atualizar o app

1. Abra [OAuth App settings](https://github.com/settings/applications/3659122)
2. Copie o **Client ID**
3. Clique **Generate a new client secret** e copie o secret (exibido uma vez)
4. Configure localmente (defina as variáveis **apenas na sessão do terminal**, nunca no Git):

```powershell
$env:GITHUB_OAUTH_CLIENT_ID="<seu_client_id>"
# Defina o client secret via Read-Host ou variável de ambiente do SO
node scripts/setup-github-oauth.mjs
```

Ou edite `BackEnd/.env` e preencha `GITHUB_OAUTH_CLIENT_ID` e `GITHUB_OAUTH_CLIENT_SECRET` manualmente.

5. Reinicie o BackEnd (`npm run dev` ou Docker)

## Variáveis

```env
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
GITHUB_OAUTH_CALLBACK_URL=http://localhost:3000/v1/auth/github/callback
FRONTEND_URL=http://localhost:3001
```

## Consentimento LGPD (obrigatório)

**Versão da política:** 1.1.0

### Login por e-mail

Checkboxes de Termo de Uso e Política de Privacidade no formulário de login. Aceite registrado em `data/consents.json` (`kind: email_login`).

### Login GitHub OAuth

Antes do redirect ao GitHub, o usuário deve:

1. Ler permissões, finalidades, terceiros e direitos do titular
2. Aceitar Termo de Uso, Política de Privacidade, tratamento de dados e escopos OAuth
3. Clicar **Aceito e continuar** ou **Não aceito** (permanece no login por e-mail)

O aceite é registrado em `data/consents.json` (`kind: github_oauth`) com IP, user-agent e versão da política.

### Remediação automática

Antes de aplicar correções (individual ou em lote), usuários com permissão `remediation:apply` devem aceitar consentimento específico (`kind: remediation`).

Revogação GitHub: `DELETE /auth/github/disconnect` ou botão **Desconectar** na página de Auditorias.

## Scopes solicitados

`read:user`, `user:email`, `repo`, `security_events` — necessários para auditar repositórios públicos/privados e alertas Dependabot.

## Produção

Atualize callback e URLs para o domínio real:

- `GITHUB_OAUTH_CALLBACK_URL=https://api.seudominio.com/v1/auth/github/callback`
- `FRONTEND_URL=https://audit.seudominio.com`

E registre as mesmas URLs no OAuth App no GitHub.
