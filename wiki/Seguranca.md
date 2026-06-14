# Política de Segurança

Diretrizes de segurança do App Audit — para operadores da plataforma e reporte de vulnerabilidades.

---

## Reporte de vulnerabilidades

Se você descobrir uma vulnerabilidade de segurança no App Audit:

1. **Não** abra issue pública
2. Envie reporte privado via [Security Advisories](https://github.com/FranciscoStanley/app-audit/security/advisories/new) ou e-mail do mantenedor
3. Inclua: descrição, passos para reproduzir, impacto estimado

Documento completo: [SECURITY.md](https://github.com/FranciscoStanley/app-audit/blob/master/SECURITY.md)

---

## Boas práticas para operadores

### Secrets e credenciais

| ✅ Faça | ❌ Não faça |
|---------|------------|
| `JWT_SECRET` com 32+ chars aleatórios | Commitar `.env` no Git |
| Rotacionar `GITHUB_TOKEN` periodicamente | Expor Swagger em produção |
| Usar secrets manager em CI | Credenciais fixas no código |
| Backup cifrado do volume `data/` | Compartilhar tokens entre ambientes |

### Rede

- HTTPS obrigatório em produção
- `CORS_ORIGIN` com URL exata (sem wildcard)
- API não exposta publicamente se possível (proxy interno)
- Firewall restritivo na VM

### Aplicação

```env
SWAGGER_ENABLED=false
NODE_ENV=production
```

- Desabilitar endpoints de debug
- Monitorar `/health/ready`
- Revisar PRs de remediação antes de merge

---

## CI/CD do projeto

| Workflow | Função |
|----------|--------|
| `ci.yml` | Testes, lint, build, e2e smoke |
| `security.yml` | npm audit, gitleaks |
| `release.yml` | Publish GHCR em tags semver |

Antes de deploy:

```bash
npm run security:scan
```

---

## Remediação automatizada

A remediação altera repositórios GitHub. Mitigações:

| Risco | Mitigação |
|-------|-----------|
| Push direto em main | Fallback automático para PR |
| Alteração não intencional | Consentimento LGPD + preview |
| Token comprometido | Escopos mínimos, rotação |
| Lockfile inválido | Regeneração + commit único |

**Sempre revise PRs automatizados antes de merge em produção.**

---

## Dados sensíveis no volume

| Arquivo | Conteúdo sensível |
|---------|-------------------|
| `users.json` | Hashes de senha |
| `github-connections.json` | Tokens OAuth cifrados |
| `audits/` | Findings de segurança |
| `consents.json` | Registros LGPD |

Proteja o volume com permissões restritas e backup cifrado.

---

## Dependências

- Dependabot configurado no repositório
- `npm audit` no pipeline de CI
- `.gitleaks.toml` para detecção de secrets no código

---

## O que o App Audit detecta (meta)

A plataforma audita **seus** repositórios, mas também deve ser operada com segurança:

- Mantenha a instância atualizada (tags semver)
- Monitore advisories do próprio projeto
- Não use versões não release em produção

---

## Próximos passos

- [Deploy em Produção](Deploy-Producao) — checklist
- [Operações](Operacoes) — backup e monitoramento
- [LGPD](LGPD) — privacidade e consentimentos
