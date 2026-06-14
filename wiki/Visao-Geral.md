# Visão Geral

O **App Audit** é uma plataforma open source de auditoria de segurança para repositórios GitHub, projetada como **appliance self-hosted** (single-tenant). Ela centraliza a detecção de riscos e oferece caminhos de correção automatizados, com conformidade LGPD integrada.

---

## Problema que resolve

Equipes que gerenciam múltiplos repositórios GitHub enfrentam desafios recorrentes:

- **Malware e supply chain** — pacotes comprometidos, padrões Miasma, domínios C2
- **Secrets expostos** — tokens e credenciais em código ou histórico
- **CI/CD inseguro** — GitHub Actions não fixadas ou comprometidas
- **Dependências vulneráveis** — alertas Dependabot e advisories públicos
- **Remediação manual lenta** — atualizar lockfiles, abrir PRs, habilitar Dependabot

O App Audit unifica essas verificações em um dashboard único, com jobs assíncronos e remediação quando autorizada pelo usuário.

---

## Público-alvo

| Perfil | Uso típico |
|--------|------------|
| **DevSecOps / SRE** | Deploy self-hosted, monitoramento contínuo |
| **Desenvolvedores** | Auditoria antes de releases, correção de findings |
| **Administradores** | Gestão de usuários RBAC, políticas LGPD |
| **Consultores de segurança** | Relatórios PDF/MD para clientes |

---

## Principais funcionalidades

### 1. Auditoria de segurança (Miasma)

Varredura abrangente por repositório:

| Categoria | Exemplos de detecção |
|-----------|---------------------|
| Malware Indicators | Arquivos maliciosos IDE, padrões Miasma, domínios C2 |
| Secrets Exposure | Tokens, API keys, credenciais em arquivos |
| CI/CD Security | Actions não fixadas, actions comprometidas |
| Dependency Vulnerabilities | Pacotes OSM/GHSA, alertas Dependabot |
| Supply Chain | Repositórios clonados afetados, configs suspeitas |

### 2. Remediação automática

- Correção individual ou em lote (jobs assíncronos)
- Atualização de manifestos e lockfiles (pnpm, npm, yarn, pip)
- Pull Request automático em branches protegidas
- Habilitação de Dependabot quando aplicável

### 3. Threat Intelligence

- Sincronização com **GitHub Advisory Database**
- Integração com **OpenSourceMalware API**
- Cache persistente com baseline Miasma embutido

### 4. Governança e conformidade

- **RBAC** com três papéis: `admin`, `auditor`, `viewer`
- **LGPD**: consentimentos para login e-mail, OAuth GitHub e remediação
- Termo de Uso e Política de Privacidade integrados à UI

### 5. Relatórios e exportação

- Relatório consolidado em Markdown e PDF
- Findings individuais por vulnerabilidade
- Histórico paginado de auditorias

---

## Modelo de deploy

```
┌─────────────────────────────────────────┐
│  VM / Docker Host (single-node)         │
│  ┌─────────────┐  ┌─────────────┐       │
│  │  Frontend   │  │   BackEnd   │       │
│  │  :3001      │──│   :3000     │       │
│  └─────────────┘  └──────┬──────┘       │
│                          │              │
│                   ┌──────▼──────┐       │
│                   │ audit-data  │       │
│                   │  (volume)   │       │
│                   └─────────────┘       │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
    Navegador           GitHub API / OSM
```

> **Nota:** v1 é single-node com persistência em arquivos. Consulte [Limitações v1](Limitacoes) antes de escalar.

---

## Versão atual

| Item | Valor |
|------|-------|
| Versão | **1.1.0** |
| API | Prefixo `/v1` |
| Licença | MIT |
| Autor | Francisco Stanley Rodrigues Albuquerque |

---

## Próximos passos

1. [Início Rápido](Inicio-Rapido) — subir a plataforma
2. [Arquitetura](Arquitetura) — entender o design
3. [Autenticação & RBAC](Autenticacao-RBAC) — configurar usuários
4. [Auditoria](Auditoria) — executar a primeira varredura
