# Wiki — App Audit

Fonte versionada da [GitHub Wiki](https://github.com/FranciscoStanley/app-audit/wiki).

## Publicar

Após alterar páginas em `wiki/`:

```bash
node scripts/publish-wiki.mjs
```

Ou dispare o workflow **Sync Wiki** em Actions (recomendado na primeira publicação).

## Estrutura

| Arquivo | Função |
|---------|--------|
| `Home.md` | Página inicial da wiki |
| `_Sidebar.md` | Navegação lateral |
| `_Footer.md` | Rodapé |
| `*.md` | Páginas temáticas |

## Primeira publicação

Se o push local falhar com `Repository not found`:

1. Abra https://github.com/FranciscoStanley/app-audit/wiki/_new
2. **Título:** `Home` (sem prefixo `wiki-`, sem `.md`)
3. Cole o conteúdo de `wiki/Home.md` → **Save**
4. Execute: `node scripts/publish-wiki.mjs`

> **Não** crie páginas com título `wiki Home.md` — isso gera URL incorreta `/wiki/wiki-Home.md`.
