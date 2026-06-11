# Arquitetura — App Audit

**Autor:** Francisco Stanley Rodrigues Albuquerque

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
            RemAdapter["GhCliRemediationAdapter"]
            ThreatStore["ThreatIntelligenceStore"]
            ReportStore["AuditReportStore"]
            PDF["PdfReportGenerator"]
        end

        subgraph Domain["Domain"]
            Entities["Entities & Ports"]
            RBAC["RBAC Constants"]
        end
    end

    subgraph External["Serviços externos"]
        GitHub["GitHub API / gh CLI"]
        GHSA["GitHub Advisory Database"]
        OSM["OpenSourceMalware API"]
    end

    subgraph Storage["Persistência local"]
        DataDir["data/audits/{id}/"]
        Findings["findings/{findingId}.md|pdf"]
    end

    Browser --> Pages
    Pages --> Store
    Pages --> APIClient
    Postman --> AuthC
    APIClient -->|JWT Bearer| AuthC
    APIClient --> AuditC
    APIClient --> ThreatC

    AuthC --> AuthSvc
    AuditC --> RunAudit
    AuditC --> Remediation
    Remediation --> RemWorkspace
    Remediation --> RemAdapter
    RemWorkspace --> GitHub
    RemAdapter --> GitHub
    AuditC --> ReportStore
    ThreatC --> SyncIntel
    ThreatC --> ThreatStore

    RunAudit --> Scanner
    RunAudit --> GhCLI
    RunAudit --> ThreatStore
    Scanner --> GhCLI
    SyncIntel --> GHSA
    SyncIntel --> OSM

    GhCLI --> GitHub
    ReportStore --> DataDir
    ReportStore --> Findings
    PDF --> Findings
```

## Clean Architecture (BackEnd)

```mermaid
flowchart LR
    subgraph outer["Camadas externas → internas"]
        P["presentation/"] --> A["application/"]
        A --> D["domain/"]
        I["infrastructure/"] --> D
        P -.->|DTOs| A
        A -.->|ports| I
    end
```

| Camada | Responsabilidade | Exemplos |
|--------|------------------|----------|
| **domain** | Regras e contratos puros | `AuditReport`, `ThreatFinding`, `GITHUB_REPOSITORY_PORT` |
| **application** | Orquestração de casos de uso | `RunMiasmaAuditUseCase`, `RemediationUseCase` |
| **infrastructure** | Adapters e I/O | `GhCliGitHubAdapter`, scanners, storage |
| **presentation** | HTTP, Swagger, guards | Controllers, DTOs, decorators RBAC |

## Fluxo de auditoria (jobs assíncronos)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant API as AuditController
    participant JQ as BackgroundJobStore
    participant WP as BackgroundJobProcessor
    participant UC as RunMiasmaAuditUseCase
    participant ST as AuditReportStore

    U->>F: Nova auditoria
    F->>API: POST /audit/jobs/audit-run
    API->>JQ: create(pending)
    API-->>F: 202 jobId
    WP->>JQ: markRunning + execute
    UC->>ST: save(report)
    WP->>JQ: markCompleted(auditId)

    loop polling 2.5s
        F->>API: GET /audit/jobs/:id
        API-->>F: status + progress
    end
    F-->>U: Banner + dashboard atualizado
```

> Endpoints síncronos `POST /audit/run` permanecem para CLI. Ver também fluxo legado abaixo.

## Fluxo de auditoria (síncrono — legado)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant API as AuditController
    participant UC as RunMiasmaAuditUseCase
    participant TI as ThreatIntel Sync
    participant GH as gh CLI
    participant SC as ComprehensiveScanner
    participant ST as AuditReportStore

    U->>F: Executar auditoria
    F->>API: POST /audit/run (JWT)
    API->>UC: execute()
    UC->>TI: sync (opcional)
    UC->>GH: listRepositories()
    loop cada repositório
        UC->>SC: scan(repo)
        SC->>GH: contents, workflows, deps
    end
    UC->>ST: save(report, markdown)
    UC->>ST: saveAllFindingReports()
    ST-->>API: auditId
    API-->>F: report + auditId
    F-->>U: Dashboard atualizado
```

## Fluxo de autenticação e RBAC

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as AuthController
    participant J as JwtStrategy
    participant G as RolesGuard

    C->>A: POST /auth/login
    A-->>C: accessToken + user.role

    C->>A: GET /audit/reports (Bearer)
    A->>J: validate token
    J->>G: check @Permissions
    G-->>C: 200 ou 403
```

## Papéis e permissões

```mermaid
flowchart LR
    Admin["admin"] --> P1["audit:*"]
    Admin --> P2["remediation:*"]
    Admin --> P3["threat-intel:*"]
    Admin --> P4["users:manage"]

    Auditor["auditor"] --> P1
    Auditor --> P2
    Auditor --> P3

    Viewer["viewer"] --> P5["audit:read"]
    Viewer --> P6["audit:download"]
    Viewer --> P7["threat-intel:read"]
```

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
    AS --> A4["Alertas Dependabot (GitHub API)"]
```

## Fluxo de remediação automática

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant API as AuditController
    participant UC as RemediationUseCase
    participant WS as RemediationGitWorkspace
    participant GH as GitHub

    U->>F: Aplicar correção / Corrigir todas
    F->>API: POST /audit/remediation/:id/apply
    API->>UC: apply(findingId, userId)
    UC->>WS: clone(owner, repo)
    UC->>WS: alterações locais (manifest, gitignore, workflows)
    UC->>WS: regenerateLockfiles(pnpm/npm/yarn)
    UC->>WS: deliver (push ou PR)
    WS->>GH: git push / gh pr create
    UC->>GH: enableDependabot / createSecurityIssue
    UC-->>F: success + pullRequestUrl?
    F-->>U: Resultado + link PR
```

## Estrutura de persistência

```
BackEnd/data/audits/
└── {auditId}/
    ├── report.json      # relatório completo
    ├── report.md        # markdown consolidado
    ├── report.pdf       # PDF consolidado (sob demanda)
    └── findings/
        ├── {findingId}.md
        └── {findingId}.pdf

BackEnd/data/jobs/
└── {jobId}/
    └── job.json         # fila assíncrona (audit, remediação)
```
