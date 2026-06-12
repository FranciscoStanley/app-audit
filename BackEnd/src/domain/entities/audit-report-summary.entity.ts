/** Metadados leves para listagem paginada — sem payload completo do relatório */
export interface AuditReportSummary {
  id: string;
  createdAt: string;
  githubUsername: string;
  verdict: string;
  totalVulnerabilities: number;
  repositoryCount: number;
}
