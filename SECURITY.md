# Política de Segurança

## Versões suportadas

Correções de segurança são aplicadas nas versões em desenvolvimento ativo:

| Versão | Suportada |
|--------|-----------|
| `master` / última release | Sim |
| Versões anteriores | Não |

## Reportar uma vulnerabilidade

Se você identificar uma vulnerabilidade de segurança no App Audit:

1. **Não** abra uma issue pública nem divulgue detalhes em fóruns ou redes sociais.
2. Envie um reporte **privado** via [GitHub Security Advisories](https://github.com/FranciscoStanley/app-audit/security/advisories/new) (**Report a vulnerability**) ou por e-mail ao mantenedor.
3. Inclua:
   - Descrição do problema e componente afetado (API, frontend, OAuth, scanners, etc.)
   - Passos para reproduzir ou proof-of-concept
   - Impacto estimado (confidencialidade, integridade, disponibilidade)
   - Versão/commit testado e ambiente (Docker, local, produção)

### O que esperar

| Etapa | Prazo alvo |
|-------|------------|
| Confirmação de recebimento | 5 dias úteis |
| Avaliação inicial e severidade | 10 dias úteis |
| Correção ou plano de mitigação | Conforme criticidade |
| Divulgação coordenada | Após patch disponível |

Agradecemos reportes responsáveis. Quando aplicável, créditos serão mencionados no advisory ou changelog com sua autorização.

## Escopo

Estão **no escopo**:

- API NestJS (`BackEnd/`) — autenticação JWT, OAuth GitHub, RBAC, endpoints de auditoria
- Frontend Next.js (`frontend/`) — sessão, rotas protegidas, fluxo LGPD/OAuth
- Scripts de setup, CI e varredura de secrets
- Tratamento de tokens OAuth e dados de usuário em repouso

Estão **fora de escopo**:

- Vulnerabilidades em dependências já reportadas upstream (use `npm audit` / Dependabot)
- Configurações inseguras do deploy do usuário (`.env` exposto, CORS `*`, secrets em repositório)
- Ataques que exijam acesso físico ou comprometimento prévio do servidor do operador

## Medidas de segurança implementadas

- Rate limiting em endpoints de autenticação
- Helmet (headers HTTP de segurança)
- Validação de entrada com `class-validator`
- Senhas com bcrypt (12 rounds)
- JWT com expiração configurável
- OAuth: código de uso único (JWT não exposto na URL de callback)
- Tokens GitHub cifrados em repouso (AES-256-GCM)
- Consentimento LGPD registrado antes do OAuth
- CI: Gitleaks + varredura local de padrões de secrets (`npm run security:scan`)

## Boas práticas para quem faz deploy

### Nunca versionar

- Arquivos `.env` com credenciais reais
- `BackEnd/data/` (usuários, tokens OAuth cifrados, relatórios, consentimentos)
- Chaves privadas (`.pem`, `.key`)

Execute antes de cada push:

```bash
npm run security:scan
```

### Variáveis obrigatórias em produção

| Variável | Requisito |
|----------|-----------|
| `JWT_SECRET` | 32+ caracteres (`openssl rand -base64 48`) |
| `CORS_ORIGIN` | URL exata do frontend (sem `*`) |
| `GITHUB_TOKEN` | Token com escopos mínimos necessários |
| `ADMIN_PASSWORD` | 12+ caracteres, forte e único |

### OAuth GitHub

- `GITHUB_OAUTH_CLIENT_ID` e secret apenas no servidor ou secret manager
- Callback URL deve apontar para a **API** (`:3000`), não para o frontend
- Revogação: `DELETE /auth/github/disconnect` ou botão **Desconectar** na UI

### Checklist antes do primeiro push público

```bash
git check-ignore -v BackEnd/.env .env
npm run security:scan
git log --all --full-history -- "*.env" "BackEnd/.env"
```

Se secrets foram commitados por engano, **rotacione todas as credenciais** e limpe o histórico (`git filter-repo` ou BFG) antes de tornar o repositório público.

## Contribuições de segurança

Consulte [CONTRIBUTING.md](./CONTRIBUTING.md) para o fluxo geral de PRs. Correções de segurança sensíveis podem ser coordenadas em private fork ou advisory antes do merge público.
