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

Se o push local falhar com `Repository not found`, execute o workflow `.github/workflows/wiki-sync.yml` via GitHub Actions — ele cria o repositório wiki na primeira execução bem-sucedida.
