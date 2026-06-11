# Política de Segurança

## Reportar vulnerabilidades

Se você encontrar uma vulnerabilidade de segurança neste projeto:

1. **Não** abra uma issue pública.
2. Envie um e-mail para o mantenedor com descrição, passos para reproduzir e impacto estimado.
3. Aguarde confirmação em até 5 dias úteis.

## Boas práticas para quem faz deploy

### Nunca versionar

- Arquivos `.env` com credenciais reais
- `BackEnd/data/` (usuários, tokens OAuth cifrados, relatórios)
- Chaves privadas (`.pem`, `.key`)

Execute `npm run security:scan` antes de cada push.

### Variáveis obrigatórias em produção

| Variável | Requisito |
|----------|-----------|
| `JWT_SECRET` | 32+ caracteres, gerado com `openssl rand -base64 48` |
| `CORS_ORIGIN` | URL exata do frontend (sem `*`) |
| `GITHUB_TOKEN` | Token com escopos mínimos necessários |
| `ADMIN_PASSWORD` | 12+ caracteres |

### OAuth GitHub

- Configure `GITHUB_OAUTH_CLIENT_ID` e `GITHUB_OAUTH_CLIENT_SECRET` apenas no servidor
- Callback URL deve apontar para a API, não para o frontend
- Tokens OAuth dos usuários são cifrados com AES-256-GCM usando `JWT_SECRET` como chave derivada

### Antes do primeiro push público

```bash
# Verificar se .env está ignorado
git check-ignore -v BackEnd/.env .env

# Escanear secrets nos arquivos versionados
npm run security:scan

# Verificar histórico (se já commitou .env por engano)
git log --all --full-history -- "*.env" "BackEnd/.env"
```

Se secrets foram commitados acidentalmente, **rotacione todas as credenciais** e use `git filter-repo` ou BFG para limpar o histórico antes de tornar o repositório público.

## Medidas implementadas

- Rate limiting em endpoints de autenticação
- Helmet (headers de segurança HTTP)
- Validação de entrada com `class-validator`
- Senhas com bcrypt (12 rounds)
- JWT com expiração configurável
- OAuth: código de uso único (não expõe JWT na URL)
- Tokens GitHub cifrados em repouso
- CI com Gitleaks e varredura de padrões de secrets
