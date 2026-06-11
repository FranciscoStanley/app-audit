---
name: auto-dev-approve
description: >-
  Auto-aprova execução de comandos, MCP e implementações durante desenvolvimento.
  Commits e push Git permanecem manuais e exigem autorização explícita do usuário.
  Use em toda implementação neste monorepo.
---

# Auto-dev-approve — App Audit

**Autor:** Francisco Stanley Rodrigues Albuquerque

## Política do usuário (verbatim)

> Configure o auto aprove e auto allow list para tudo que precisar durante as implementações só não commit nada sem minha autorização.

## O que auto-aprovar

- Instalar dependências (`npm`, `npx`, `docker compose`)
- Build, testes, lint, dev servers
- Editar/criar arquivos no workspace
- Ferramentas MCP (`mcpAllowlist: *:*` em `.cursor/permissions.json`)
- Git **somente leitura**: `status`, `diff`, `log`, `branch`, `check-ignore`
- `gh api` para leitura, screenshots, validação

## O que NUNCA auto-aprovar

- `git commit`, `git push`, `git add` (hook em `.cursor/hooks/block-git-publish.mjs`)
- `git reset --hard`, `push --force`, `clean -fd`
- Commitar `.env`, `BackEnd/data/`, secrets ou credenciais
- Push para remoto sem pedido explícito

## Arquivos de configuração

| Arquivo | Função |
|---------|--------|
| `.cursor/permissions.json` | Terminal + MCP allowlist + `autoRun` hints |
| `.cursor/hooks.json` | Pede confirmação em git commit/push/add |
| `.vscode/settings.json` | Auto-run do agente no workspace |

## Commits manuais

1. Usuário pede explicitamente: *"faça o commit"*, *"commita"*, etc.
2. Rodar `git status`, `git diff`, `git log` antes de propor mensagem
3. **Nunca** `git push` sem pedido explícito separado
4. Seguir Conventional Commits e skill `organize-commits` se múltiplos escopos

## Run Mode no Cursor

Ative em **Cursor Settings → Agent → Run Mode** (Auto-review ou Allowlist).

Reinicie a janela após alterar `permissions.json`.

## Checklist ao iniciar tarefa

- [ ] Run Mode ativo
- [ ] Não planejar commits proativos
- [ ] Executar build/testes sem pedir permissão a cada comando allowlisted
- [ ] Ao terminar: informar o que mudou; **não** commitar automaticamente
