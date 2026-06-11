import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  GitHubAdvisoryPort,
  GitHubAdvisoryRecord,
} from '../../domain/ports/threat-intelligence.port';

const execFileAsync = promisify(execFile);

interface RawAdvisory {
  ghsa_id: string;
  cve_id: string | null;
  summary: string;
  description: string | null;
  severity: string;
  type: string;
  published_at: string;
  updated_at: string;
  html_url: string;
  vulnerabilities: Array<{
    package: {
      ecosystem: string;
      name: string | null;
      vulnerable_version_range: string | null;
    } | null;
  }> | null;
}

@Injectable()
export class GitHubAdvisoryAdapter implements GitHubAdvisoryPort {
  private readonly logger = new Logger(GitHubAdvisoryAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async fetchMalwareAdvisories(
    since = '2026-01-01',
  ): Promise<GitHubAdvisoryRecord[]> {
    const token = await this.resolveToken();
    const advisories: GitHubAdvisoryRecord[] = [];
    let page = 1;
    const perPage = 100;
    const maxPages = Number(this.config.get('GITHUB_ADVISORY_MAX_PAGES') ?? 10);

    while (page <= maxPages) {
      const batch = await this.fetchPage(token, since, page, perPage);
      if (batch.length === 0) break;
      advisories.push(...batch);
      if (batch.length < perPage) break;
      page++;
    }

    this.logger.log(
      `${advisories.length} advisories de malware carregadas do GitHub`,
    );
    return advisories;
  }

  private async fetchPage(
    token: string | null,
    since: string,
    page: number,
    perPage: number,
  ): Promise<GitHubAdvisoryRecord[]> {
    const params = new URLSearchParams({
      type: 'malware',
      sort: 'updated',
      direction: 'desc',
      per_page: String(perPage),
      page: String(page),
      updated: `>${since}`,
    });

    const url = `https://api.github.com/advisories?${params}`;

    if (token) {
      return this.fetchViaHttp(token, url);
    }

    try {
      return await this.fetchViaGhCli(since, page, perPage);
    } catch (error) {
      this.logger.warn(
        `GitHub Advisories indisponível: ${(error as Error).message}`,
      );
      return [];
    }
  }

  private async fetchViaHttp(
    token: string,
    url: string,
  ): Promise<GitHubAdvisoryRecord[]> {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'app-audit-security-scanner',
      },
    });

    if (!response.ok) {
      throw new Error(
        `GitHub Advisories HTTP ${response.status}: ${await response.text()}`,
      );
    }

    const data = (await response.json()) as RawAdvisory[];
    return data.map((item) => this.mapAdvisory(item));
  }

  private async fetchViaGhCli(
    since: string,
    page: number,
    perPage: number,
  ): Promise<GitHubAdvisoryRecord[]> {
    const { stdout } = await execFileAsync(
      'gh',
      [
        'api',
        `advisories?type=malware&sort=updated&direction=desc&per_page=${perPage}&page=${page}&updated=>${since}`,
      ],
      { maxBuffer: 20 * 1024 * 1024, windowsHide: true },
    );

    const data = JSON.parse(stdout) as RawAdvisory[];
    return data.map((item) => this.mapAdvisory(item));
  }

  private mapAdvisory(item: RawAdvisory): GitHubAdvisoryRecord {
    return {
      ghsaId: item.ghsa_id,
      cveId: item.cve_id,
      summary: item.summary,
      description: item.description,
      severity: item.severity,
      type: item.type,
      publishedAt: item.published_at,
      updatedAt: item.updated_at,
      htmlUrl: item.html_url,
      packages: (item.vulnerabilities ?? [])
        .filter((v) => v.package?.name)
        .map((v) => ({
          ecosystem: v.package!.ecosystem,
          name: v.package!.name,
          vulnerableVersionRange: v.package!.vulnerable_version_range,
        })),
    };
  }

  private async resolveToken(): Promise<string | null> {
    const envToken = this.config.get<string>('GITHUB_TOKEN');
    if (envToken) return envToken;

    try {
      const { stdout } = await execFileAsync('gh', ['auth', 'token'], {
        windowsHide: true,
      });
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }
}
