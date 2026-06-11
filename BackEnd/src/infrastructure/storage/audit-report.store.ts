import { Injectable } from '@nestjs/common';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AuditReport } from '../../domain/entities/audit-report.entity';
import { StoredAuditReport } from '../../domain/entities/stored-audit.entity';
import {
  RepositoryScan,
  ThreatFinding,
} from '../../domain/entities/repository-scan.entity';

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

  async list(): Promise<StoredAuditReport[]> {
    try {
      const dirs = await readdir(this.baseDir);
      const reports: StoredAuditReport[] = [];
      for (const id of dirs) {
        const stored = await this.getById(id);
        if (stored) reports.push(stored);
      }
      return reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return [];
    }
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
    const reports = await this.list();
    for (const stored of reports) {
      const match = this.findInReport(stored.id, stored.report, findingId);
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
}
