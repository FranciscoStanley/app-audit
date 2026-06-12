# Skills — App Audit Monorepo

> **Rule always-on:** [cursor-workflow](../rules/cursor-workflow.mdc) — o agente usa este índice e as skills **automaticamente**, sem pedir confirmação.

| Skill | Escopo |
|-------|--------|
| [app-audit-development](./app-audit-development/SKILL.md) | Orquestrador geral |
| [app-audit-backend](./app-audit-backend/SKILL.md) | NestJS API |
| [app-audit-frontend](./app-audit-frontend/SKILL.md) | Next.js UI |
| [app-audit-auth-rbac](./app-audit-auth-rbac/SKILL.md) | JWT + papéis |
| [app-audit-security-scan](./app-audit-security-scan/SKILL.md) | Scanners e remediação |
| [change-sync-docs-tests](./change-sync-docs-tests/SKILL.md) | **Sincronizar testes, Swagger e docs** |
| [auto-dev-approve](./auto-dev-approve/SKILL.md) | **Auto-aprovar dev; commits manuais** |

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Rules (`.cursor/rules/`)

| Rule | Escopo |
|------|--------|
| [cursor-workflow](../rules/cursor-workflow.mdc) | Workflow automático — consultar skills/rules sem pedir ao usuário |
| [app-audit](../rules/app-audit.mdc) | Stack, camadas, convenções do monorepo |
| [change-sync](../rules/change-sync.mdc) | Resumo: testes, Swagger e docs ao mudar features |
| [auto-dev-approve](../rules/auto-dev-approve.mdc) | Auto-aprovar comandos; commits manuais |

## Ordem de consulta (agente)

1. Rule do arquivo (`globs`) → **app-audit-development** → skill de domínio
2. Ao alterar funcionalidade: **change-sync-docs-tests** antes de concluir
3. Execução local: **auto-dev-approve**

Ver detalhes em [cursor-workflow](../rules/cursor-workflow.mdc).
