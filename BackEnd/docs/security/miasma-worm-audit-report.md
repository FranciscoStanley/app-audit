# Relatório de Auditoria de Segurança
## Worm Miasma — Supply Chain Attack (Junho 2026)

| Campo | Valor |
|-------|-------|
| **Conta auditada** | [@FranciscoStanley](https://github.com/FranciscoStanley) |
| **Data da auditoria** | 10/06/2026, 23:07:09 |
| **Veredito** | 🟢 **NÃO AFETADO** |
| **Fonte de inteligência** | [StepSecurity — Miasma Worm](https://www.stepsecurity.io/blog/miasma-worm-hits-microsoft-again-azure-functions-action-and-72-other-repositories-disabled-after-supply-chain-attack-targeting-ai-coding-agents) |

---

## Resumo Executivo

A conta **@FranciscoStanley** foi auditada em **83** repositórios (55 públicos, 28 privados). **Nenhum indicador do worm Miasma foi detectado.** Recomenda-se seguir as medidas preventivas listadas abaixo.

## Escopo da Auditoria

| Métrica | Quantidade |
|---------|------------|
| Repositórios analisados | **83** |
| Repositórios públicos | 55 |
| Repositórios privados | 28 |
| Repositórios afetados | **0** |
| Repositórios limpos | 83 |

## Repositórios Afetados

> Nenhum repositório apresentou indicadores do ataque Miasma.

## Tecnologias Identificadas

| Tecnologia | Repositórios | Afetados | Nível de Risco |
|------------|--------------|----------|----------------|
| JavaScript | 27 | 0 | 🟢 Nenhum |
| Desconhecida | 23 | 0 | 🟢 Nenhum |
| TypeScript | 15 | 0 | 🟢 Nenhum |
| Python | 7 | 0 | 🟢 Nenhum |
| HTML | 6 | 0 | 🟢 Nenhum |
| PHP | 3 | 0 | 🟢 Nenhum |
| Kotlin | 1 | 0 | 🟢 Nenhum |
| CSS | 1 | 0 | 🟢 Nenhum |

## Threat Intelligence — Status da Sincronização

| Campo | Valor |
|-------|-------|
| Última sincronização | 10/06/2026, 22:59:00 |
| Pacotes na base | **109** |
| Repositórios na base | **16** |
| GitHub Advisories | ✅ Ativo |
| OpenSourceMalware | ⚠️ Token ausente |

## Fontes de Threat Intelligence (atualização automática)

| Fonte | Endpoint | Frequência |
|-------|----------|------------|
| [GitHub Advisory Database](https://github.com/advisories) | `GET /advisories?type=malware` | A cada 6h |
| [OpenSourceMalware](https://opensourcemalware.com/) | `GET /functions/v1/check-malicious` | Por dependência + sync |
| Baseline Miasma | Constantes locais | Fallback permanente |

## Indicadores Verificados

### Arquivos maliciosos (execução ao abrir pasta no IDE/AI)
- `.github/setup.js` — payload obfuscado (~4,6 MB)
- `.claude/settings.json` — hook SessionStart
- `.gemini/settings.json` — hook SessionStart
- `.cursor/rules/setup.mdc` — prompt injection com `alwaysApply: true`
- `.vscode/tasks.json` — task com `runOn: folderOpen`

### Dependências comprometidas
- **PyPI:** `durabletask` versões 1.4.1, 1.4.2, 1.4.3
- **npm:** `@redhatcloudservices/*`, `@tiledesk/tiledesk-server`, ecossistema `@antv`, TanStack
- **GitHub Actions:** `Azure/functions-action`, `Azure/functions-container-action`

### Domínios C2
- `check.git-service.com`
- `t.m-kosche.com`
- `git-service.com`

## Medidas Imediatas

### 1. Inspecionar repositórios clonados após 2 de junho de 2026

Se você clonou repositórios Microsoft/Azure (ex.: Azure/durabletask, azure-functions-host) e abriu no Cursor, VS Code, Claude Code ou Gemini CLI, trate o sistema como comprometido.

### 2. Rotacionar credenciais

Rotacione tokens GitHub, npm, AWS, Azure, GCP, SSH, Kubernetes secrets e variáveis de ambiente se houve exposição.

### 3. Auditar GitHub Actions

Revise workflows que usam Azure/functions-action@v1. Fixe actions por commit SHA, não por tag mutável.

### 4. Verificar dependências

Confirme ausência de durabletask 1.4.1–1.4.3 (PyPI) e pacotes @redhatcloudservices no npm. Execute npm audit e pip audit nos projetos ativos.

### 5. Monitorar domínios C2

Verifique logs de rede por conexões a check.git-service.com e t.m-kosche.com.

### 6. Prevenção contínua

Habilite branch protection, PyPI Trusted Publishing (OIDC), e inspecione .cursor/, .claude/, .gemini/ e .vscode/tasks.json em repos clonados.

## Limitações da Auditoria

- OpenSourceMalware (check-malicious) não configurado — adicione OSM_API_TOKEN no .env para verificação em tempo real por dependência.
- GitHub Advisory Database limitada às 1.000 advisories de malware mais recentes (configurável via GITHUB_ADVISORY_MAX_PAGES).

---

*Relatório gerado automaticamente por **app-audit** (NestJS) em 10/06/2026, 23:07:09.*
*Autor das convenções: Francisco Stanley Rodrigues Albuquerque*