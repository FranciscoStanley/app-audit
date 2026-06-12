import { Injectable } from '@nestjs/common';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AuditReport } from '../../domain/entities/audit-report.entity';
import { AuditReportSummary } from '../../domain/entities/audit-report-summary.entity';
import { StoredAuditReport } from '../../domain/entities/stored-audit.entity';
import {
  paginateArray,
  type PaginatedResult,
} from '../../domain/pagination/pagination';
import {
  RepositoryScan,
  ThreatFinding,
} from '../../domain/entities/repository-scan.entity';

export interface FindingListItem extends ThreatFinding {
  repository: string;
  auditId: string;
}

export interface ListFindingsFilters {
  category?: string;
  severity?: string;
  remediationAvailable?: boolean;
}

@Injectable()
export class AuditReportStore {
  private readonly baseDir = join(process.cwd(), 'data', 'audits');

  async save(
    report: AuditReport,
    markdown: string,
  ): Promise<StoredAuditReport> {
    const id = randomUUID();
    const dir = join(this.baseDir, id);
    await mkdir(dir, { recursive: true });

    const markdownPath = join(dir, 'report.md');
    const jsonPath = join(dir, 'report.json');

    await writeFile(markdownPath, markdown, 'utf-8');
    await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

    return {
      id,
      createdAt: report.auditedAt,
      report,
      markdownPath,
    };
  }

  /** @deprecated Prefer listSummariesPaginated — carrega relatórios completos */
  async list(): Promise<StoredAuditReport[]> {
    const ids = await this.listIds();
    const reports: StoredAuditReport[] = [];
    for (const id of ids) {
      const stored = await this.getById(id);
      if (stored) reports.push(stored);
    }
    return reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listSummariesPaginated(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<AuditReportSummary>> {
    const ids = await this.listIds();
    const summaries: AuditReportSummary[] = [];
    for (const id of ids) {
      const summary = await this.getSummaryById(id);
      if (summary) summaries.push(summary);
    }
    summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginateArray(summaries, page, pageSize);
  }

  async listFindingsPaginated(
    auditId: string,
    page: number,
    pageSize: number,
    filters: ListFindingsFilters = {},
  ): Promise<PaginatedResult<FindingListItem>> {
    const stored = await this.getById(auditId);
    if (!stored) {
      return paginateArray([], page, pageSize);
    }

    const repos =
      stored.report.allRepositories ?? stored.report.affectedRepositories ?? [];
    let items: FindingListItem[] = repos.flatMap((repo) =>
      repo.findings.map((f) => ({
        ...f,
        repository: repo.fullName,
        auditId,
      })),
    );

    if (filters.category) {
      items = items.filter((f) => f.category === filters.category);
    }
    if (filters.severity) {
      items = items.filter((f) => f.severity === filters.severity);
    }
    if (filters.remediationAvailable === true) {
      items = items.filter((f) => f.remediationAvailable);
    }

    return paginateArray(items, page, pageSize);
  }

  async getLatestSummary(): Promise<AuditReportSummary | null> {
    const { data } = await this.listSummariesPaginated(1, 1);
    return data[0] ?? null;
  }

  async getById(id: string): Promise<StoredAuditReport | null> {
    try {
      const jsonPath = join(this.baseDir, id, 'report.json');
      const markdownPath = join(this.baseDir, id, 'report.md');
      const content = await readFile(jsonPath, 'utf-8');
      const report = JSON.parse(content) as AuditReport;
      return { id, createdAt: report.auditedAt, report, markdownPath };
    } catch {
      return null;
    }
  }

  async getSummaryById(id: string): Promise<AuditReportSummary | null> {
    try {
      const jsonPath = join(this.baseDir, id, 'report.json');
      const content = await readFile(jsonPath, 'utf-8');
      const parsed = JSON.parse(content) as AuditReport;
      const repos = parsed.allRepositories ?? parsed.affectedRepositories ?? [];
      return {
        id,
        createdAt: parsed.auditedAt,
        githubUsername: parsed.githubUsername,
        verdict: parsed.verdict,
        totalVulnerabilities: parsed.totalVulnerabilities,
        repositoryCount: repos.length,
      };
    } catch {
      return null;
    }
  }

  async getMarkdown(id: string): Promise<string | null> {
    try {
      const path = join(this.baseDir, id, 'report.md');
      return await readFile(path, 'utf-8');
    } catch {
      return null;
    }
  }

  async setPdfPath(id: string, pdfPath: string): Promise<void> {
    const stored = await this.getById(id);
    if (!stored) return;
    stored.pdfPath = pdfPath;
    const jsonPath = join(this.baseDir, id, 'report.json');
    await writeFile(jsonPath, JSON.stringify(stored.report, null, 2), 'utf-8');
  }

  async findFindingById(
    findingId: string,
  ): Promise<(ThreatFinding & { repository: string; auditId: string }) | null> {
    const ids = await this.listIds();
    for (const id of ids) {
      const stored = await this.getById(id);
      if (!stored) continue;
      const match = this.findInReport(id, stored.report, findingId);
      if (match) return match;
    }
    return null;
  }

  findInReport(
    auditId: string,
    report: AuditReport,
    findingId: string,
  ):
    | (ThreatFinding & {
        repository: string;
        repositoryScan: RepositoryScan;
        auditId: string;
      })
    | null {
    const repos = report.allRepositories ?? report.affectedRepositories;
    for (const repo of repos) {
      const finding = repo.findings.find((f) => f.id === findingId);
      if (finding) {
        return {
          ...finding,
          repository: repo.fullName,
          repositoryScan: repo,
          auditId,
        };
      }
    }
    return null;
  }

  async findFindingInAudit(
    auditId: string,
    findingId: string,
  ): Promise<
    | (ThreatFinding & {
        repository: string;
        repositoryScan: RepositoryScan;
        auditId: string;
      })
    | null
  > {
    const stored = await this.getById(auditId);
    if (!stored) return null;
    return this.findInReport(auditId, stored.report, findingId);
  }

  findingReportPath(
    auditId: string,
    findingId: string,
    ext: 'md' | 'pdf',
  ): string {
    return join(this.baseDir, auditId, 'findings', `${findingId}.${ext}`);
  }

  async saveFindingMarkdown(
    auditId: string,
    findingId: string,
    markdown: string,
  ): Promise<string> {
    const dir = join(this.baseDir, auditId, 'findings');
    await mkdir(dir, { recursive: true });
    const path = this.findingReportPath(auditId, findingId, 'md');
    await writeFile(path, markdown, 'utf-8');
    return path;
  }

  async getFindingMarkdown(
    auditId: string,
    findingId: string,
  ): Promise<string | null> {
    try {
      return await readFile(
        this.findingReportPath(auditId, findingId, 'md'),
        'utf-8',
      );
    } catch {
      return null;
    }
  }

  async removeFindings(auditId: string, findingIds: string[]): Promise<number> {
    if (findingIds.length === 0) return 0;

    const stored = await this.getById(auditId);
    if (!stored) return 0;

    const remove = new Set(findingIds);
    const report = stored.report;
    const repos =
      report.allRepositories ?? report.affectedRepositories ?? [];

    let removed = 0;
    for (const repo of repos) {
      const before = repo.findings.length;
      repo.findings = repo.findings.filter((f) => !remove.has(f.id));
      removed += before - repo.findings.length;
      repo.vulnerabilityCount = repo.findings.length;
      repo.isAffected = repo.findings.length > 0;
    }

    if (removed === 0) return 0;

    report.affectedRepositories = repos.filter((r) => r.isAffected);
    report.cleanRepositories = repos.length - report.affectedRepositories.length;
    report.totalVulnerabilities = repos.reduce(
      (sum, r) => sum + r.vulnerabilityCount,
      0,
    );
    report.verdict =
      report.totalVulnerabilities > 0 ? 'affected' : 'not_affected';

    const jsonPath = join(this.baseDir, auditId, 'report.json');
    await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    return removed;
  }

  async saveAllFindingReports(
    auditId: string,
    report: AuditReport,
    generate: (ctx: {
      auditId: string;
      report: AuditReport;
      repository: RepositoryScan;
      finding: ThreatFinding;
    }) => string,
  ): Promise<number> {
    const repos = report.allRepositories ?? report.affectedRepositories;
    let count = 0;
    for (const repo of repos) {
      for (const finding of repo.findings) {
        const markdown = generate({
          auditId,
          report,
          repository: repo,
          finding,
        });
        await this.saveFindingMarkdown(auditId, finding.id, markdown);
        count++;
      }
    }
    return count;
  }

  private async listIds(): Promise<string[]> {
    try {
      return await readdir(this.baseDir);
    } catch {
      return [];
    }
  }
}
