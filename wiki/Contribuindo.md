# Contribuindo

Obrigado por considerar contribuir com o App Audit! Este guia resume o processo.

Documento completo: [CONTRIBUTING.md](https://github.com/FranciscoStanley/app-audit/blob/master/CONTRIBUTING.md)

---

## Como contribuir

1. **Fork** o repositório
2. **Clone** seu fork localmente
3. Crie uma **branch** descritiva: `feat/nome`, `fix/nome`, `docs/nome`
4. Implemente seguindo os padrões do projeto
5. Execute testes e lint
6. Abra um **Pull Request** para `master`

---

## Setup de desenvolvimento

```bash
git clone https://github.com/SEU-USUARIO/app-audit.git
cd app-audit
npm install
cd BackEnd && npm run setup && cd ..
npm run dev
```

Veja [Desenvolvimento Local](Desenvolvimento-Local) para detalhes.

---

## Padrões de código

| Área | Padrão |
|------|--------|
| Arquitetura | Clean Architecture (domain → application → infrastructure → presentation) |
| Commits | [Conventional Commits](https://www.conventionalcommits.org/) |
| TypeScript | Strict mode, sem `any` desnecessário |
| Testes | Jest (BE), Vitest (FE) |
| API | Prefixo `/v1`, Swagger atualizado |

---

## Checklist antes do PR

- [ ] `npm test` passa
- [ ] `npm run lint` sem erros
- [ ] Swagger sincronizado (se alterou endpoints)
- [ ] `docs/api.md` atualizado
- [ ] Collections Postman/Insomnia atualizadas
- [ ] Testes para nova funcionalidade
- [ ] Sem secrets ou `.env` no commit

---

## Estrutura de PR

```markdown
## Summary
- O que mudou e por quê

## Test plan
- [ ] Teste manual realizado
- [ ] npm test passou
```

---

## Áreas de contribuição

| Área | Onde começar |
|------|--------------|
| Scanners | `BackEnd/src/infrastructure/scanners/` |
| Remediação | `BackEnd/src/application/audit/remediation.use-case.ts` |
| Frontend | `frontend/src/app/`, `frontend/src/components/` |
| Docs | `docs/`, `wiki/` |
| CI/CD | `.github/workflows/` |

---

## Código de conduta

Todos os participantes devem seguir o [Code of Conduct](https://github.com/FranciscoStanley/app-audit/blob/master/CODE_OF_CONDUCT.md).

---

## Reporte de bugs

- Use [GitHub Issues](https://github.com/FranciscoStanley/app-audit/issues)
- Inclua: versão, SO, passos para reproduzir, logs
- Vulnerabilidades de segurança: [Security Advisories](https://github.com/FranciscoStanley/app-audit/security/advisories/new) (privado)

---

## Autor

**Francisco Stanley Rodrigues Albuquerque**

---

## Próximos passos

- [Desenvolvimento Local](Desenvolvimento-Local) — setup
- [Clean Architecture](Clean-Architecture) — padrões do BackEnd
- [Roadmap](Roadmap) — features planejadas
