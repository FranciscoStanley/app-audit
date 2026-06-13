import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AuditReportStore } from './audit-report.store';
import type { AuditReport } from '../../domain/entities/audit-report.entity';

describe('AuditReportStore', () => {
  let store: AuditReportStore;
  let baseDir: string;
  let auditId: string;

  beforeEach(async () => {
    store = new AuditReportStore();
    baseDir = await mkdtemp(join(tmpdir(), 'audit-store-'));
    auditId = 'audit-test-1';
    (store as unknown as { baseDir: string }).baseDir = join(baseDir, 'audits');

    const report: AuditReport = {
      auditedAt: '2026-01-01T00:00:00.000Z',
      githubUsername: 'user',
      totalRepositories: 1,
      publicRepositories: 1,
      privateRepositories: 0,
      allRepositories: [
        {
          name: 'repo',
          fullName: 'owner/repo',
          isPrivate: false,
          url: 'https://github.com/owner/repo',
          language: 'TypeScript',
          topics: [],
          updatedAt: '2026-01-01T00:00:00.000Z',
          findings: [
            {
              id: 'f-1',
              type: 'unpinned_action',
              severity: 'medium',
              message: 'Action unpinned',
              evidence: '.github/workflows/ci.yml',
              category: 'CI/CD',
              remediationAvailable: true,
            },
            {
              id: 'f-2',
              type: 'unpinned_action',
              severity: 'medium',
              message: 'Action unpinned 2',
              evidence: '.github/workflows/ci.yml',
              category: 'CI/CD',
              remediationAvailable: true,
            },
          ],
          isAffected: true,
          vulnerabilityCount: 2,
        },
      ],
      affectedRepositories: [],
      cleanRepositories: 0,
      totalVulnerabilities: 2,
      technologies: [],
      immediateActions: [],
      sourceReference: 'test',
      verdict: 'affected',
      limitations: [],
      threatIntel: {
        lastSyncedAt: null,
        totalPackages: 0,
        totalRepositories: 0,
        githubAdvisoryEnabled: false,
        openSourceMalwareEnabled: false,
      },
    };
    report.affectedRepositories = report.allRepositories.filter(
      (r) => r.isAffected,
    );

    const dir = join(
      (store as unknown as { baseDir: string }).baseDir,
      auditId,
    );
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'report.json'), JSON.stringify(report, null, 2));
    await writeFile(join(dir, 'report.md'), '# report');
  });

  it('removeFindings atualiza contagens e veredito', async () => {
    const removed = await store.removeFindings(auditId, ['f-1', 'f-2']);
    expect(removed).toBe(2);

    const stored = await store.getById(auditId);
    expect(stored?.report.totalVulnerabilities).toBe(0);
    expect(stored?.report.verdict).toBe('not_affected');
    expect(stored?.report.allRepositories[0].vulnerabilityCount).toBe(0);
    expect(stored?.report.affectedRepositories).toHaveLength(0);

    const raw = JSON.parse(
      await readFile(
        join(
          (store as unknown as { baseDir: string }).baseDir,
          auditId,
          'report.json',
        ),
        'utf-8',
      ),
    ) as AuditReport;
    expect(raw.totalVulnerabilities).toBe(0);
  });
});
