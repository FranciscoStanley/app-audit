# Arquitetura

Visão arquitetural completa do App Audit — monorepo, camadas e integrações.

---

## Visão geral do sistema

```mermaid
flowchart TB
    subgraph Client["Cliente"]
        Browser["Navegador"]
        Postman["Postman / Insomnia"]
    end

    subgraph Frontend["frontend/ — Next.js :3001"]
        Pages["App Router"]
        Store["Zustand Auth Store"]
        APIClient["lib/api.ts"]
    end

    subgraph BackEnd["BackEnd/ — NestJS :3000"]
        subgraph Presentation["Presentation"]
            AuthC["AuthController"]
            AuditC["AuditController"]
            ThreatC["ThreatIntelController"]
            HealthC["HealthController"]
        end

        subgraph Application["Application"]
            RunAudit["RunMiasmaAuditUseCase"]
            Remediation["RemediationUseCase"]
            SyncIntel["SyncThreatIntelligenceUseCase"]
            AuthSvc["AuthService"]
        end

        subgraph Infrastructure["Infrastructure"]
            Scanner["ComprehensiveSecurityScanner"]
            GhCLI["GhCliGitHubAdapter"]
            RemWorkspace["RemediationGitWorkspace"]
            ThreatStore["ThreatIntelligenceStore"]
            ReportStore["AuditReportStore"]
        end
    end

    subgraph External["Serviços externos"]
        GitHub["GitHub API / gh CLI"]
        GHSA["GitHub Advisory Database"]
        OSM["OpenSourceMalware API"]
    end

    subgraph Storage["Persistência local"]
        DataDir["data/audits/{id}/"]
    end

    Browser --> Pages
    Pages --> APIClient
    APIClient -->|JWT Bearer| AuthC
    APIClient --> AuditC
    APIClient --> ThreatC

    AuditC --> RunAudit
    AuditC --> Remediation
    ThreatC --> SyncIntel

    RunAudit --> Scanner
    RunAudit --> GhCLI
    SyncIntel --> GHSA
    SyncIntel --> OSM

    ReportStore --> DataDir
```

---

## Monorepo npm workspaces

```
app-audit/
├── BackEnd/     # NestJS API — rotas /v1
├── frontend/    # Next.js App Router
├── docs/        # documentação
├── scripts/     # utilitários
└── infra/       # Oracle Cloud, etc.
```

| Workspace | Porta | Responsabilidade |
|-----------|-------|------------------|
| `BackEnd` | 3000 | API REST, scanners, remediação |
| `frontend` | 3001 | Dashboard, LGPD, admin UI |

---

## Camadas do BackEnd

| Camada | Responsabilidade | Exemplos |
|--------|------------------|----------|
| **domain** | Regras e contratos puros | `AuditReport`, ports, RBAC constants |
| **application** | Orquestração de use cases | `RunMiasmaAuditUseCase`, `RemediationUseCase` |
| **infrastructure** | Adapters e I/O | `GhCliGitHubAdapter`, scanners, storage |
| **presentation** | HTTP, Swagger, guards | Controllers, DTOs, `@Permissions` |

→ Detalhes: [Clean Architecture](Clean-Architecture)

---

## Scanner de vulnerabilidades

```mermaid
flowchart TB
    CS["ComprehensiveSecurityScanner"] --> MS["MiasmaRepositoryScanner"]
    CS --> AS["AdditionalSecurityScanner"]

    MS --> M1["Arquivos maliciosos IDE"]
    MS --> M2["Padrões Miasma"]
    MS --> M3["Domínios C2"]
    MS --> M4["Dependências OSM/GHSA"]

    AS --> A1["Secrets expostos"]
    AS --> A2["Actions não fixadas"]
    AS --> A3["Dependências vulneráveis"]
    AS --> A4["Alertas Dependabot"]
```

---

## Persistência de dados

```
BackEnd/data/
├── users.json
├── consents.json
├── github-connections.json
├── threat-intel-cache.json
├── audits/{auditId}/
│   ├── report.json
│   ├── report.md
│   ├── report.pdf
│   └── findings/{findingId}.md|pdf
└── jobs/{jobId}/
    └── job.json
```

---

## Integrações externas

| Serviço | Uso |
|---------|-----|
| **GitHub API / gh CLI** | Listar repos, contents, workflows, Dependabot |
| **GitHub Advisory Database** | CVEs e advisories de pacotes |
| **OpenSourceMalware** | Pacotes e repositórios maliciosos conhecidos |

---

## API versionada

| Prefixo | Rotas |
|---------|-------|
| `/v1` | auth, audit, threat-intel |
| *(sem prefixo)* | `/health`, `/health/ready` |

Swagger (dev): `http://localhost:3000/api/docs`

---

## Próximos passos

- [Clean Architecture](Clean-Architecture) — dependências entre camadas
- [Jobs Assíncronos](Jobs-Assincronos) — fila e polling
- [Limitações v1](Limitacoes) — single-node e file storage
