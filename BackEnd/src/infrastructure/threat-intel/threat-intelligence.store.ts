import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  MIASMA_AFFECTED_REPOSITORIES,
  MIASMA_COMPROMISED_GITHUB_ACTIONS,
  MIASMA_COMPROMISED_NPM_PACKAGES,
  MIASMA_COMPROMISED_NPM_SCOPES,
  MIASMA_COMPROMISED_PYPI_PACKAGES,
  MIASMA_C2_DOMAINS,
  MIASMA_MALICIOUS_FILES,
  MIASMA_MALICIOUS_PATTERNS,
} from '../../domain/constants/miasma-threat.constants';
import type {
  CompromisedPackage,
  CompromisedRepository,
  ThreatEcosystem,
  ThreatIntelStatus,
} from '../../domain/entities/threat-intelligence.entity';
import type { ThreatIntelligenceStorePort } from '../../domain/ports/threat-intelligence.port';

@Injectable()
export class ThreatIntelligenceStore
  implements ThreatIntelligenceStorePort, OnModuleInit
{
  private readonly logger = new Logger(ThreatIntelligenceStore.name);
  private readonly cachePath = join(
    process.cwd(),
    'data',
    'threat-intel-cache.json',
  );
  private packages = new Map<string, CompromisedPackage>();
  private repositories = new Map<string, CompromisedRepository>();
  private lastSyncedAt: string | null = null;

  constructor(private readonly config: ConfigService) {
    this.seedBaseline();
  }

  async onModuleInit(): Promise<void> {
    await this.loadCache();
  }

  getPackages(): CompromisedPackage[] {
    return Array.from(this.packages.values());
  }

  getRepositories(): CompromisedRepository[] {
    return Array.from(this.repositories.values());
  }

  getMaliciousFiles(): Array<{ path: string; description: string }> {
    return MIASMA_MALICIOUS_FILES.map((path) => ({
      path,
      description:
        MIASMA_MALICIOUS_PATTERNS.find((p) => p.file === path)?.description ??
        'Indicador Miasma',
    }));
  }

  getMaliciousPatterns() {
    return MIASMA_MALICIOUS_PATTERNS;
  }

  getCompromisedActions(): string[] {
    return [...MIASMA_COMPROMISED_GITHUB_ACTIONS];
  }

  getCompromisedNpmScopes(): string[] {
    return [...MIASMA_COMPROMISED_NPM_SCOPES];
  }

  getC2Domains(): string[] {
    return [...MIASMA_C2_DOMAINS];
  }

  isPackageCompromised(
    name: string,
    ecosystem: ThreatEcosystem,
    version?: string,
  ): CompromisedPackage | null {
    const key = this.packageKey(name, ecosystem);
    const hit = this.packages.get(key);
    if (!hit) return null;

    if (version && hit.versionRange) {
      return this.versionMatches(version, hit.versionRange) ? hit : null;
    }

    return hit;
  }

  isRepositoryCompromised(fullName: string): CompromisedRepository | null {
    return this.repositories.get(fullName.toLowerCase()) ?? null;
  }

  getStatus(): ThreatIntelStatus {
    const refreshHours = Number(
      this.config.get('THREAT_INTEL_REFRESH_HOURS') ?? 6,
    );
    const nextSyncAt = this.lastSyncedAt
      ? new Date(
          new Date(this.lastSyncedAt).getTime() + refreshHours * 3600000,
        ).toISOString()
      : null;

    return {
      lastSyncedAt: this.lastSyncedAt,
      nextSyncAt,
      totalPackages: this.packages.size,
      totalRepositories: this.repositories.size,
      githubAdvisoryEnabled: true,
      openSourceMalwareEnabled: Boolean(this.config.get('OSM_API_TOKEN')),
      refreshIntervalHours: refreshHours,
    };
  }

  applySync(
    packages: CompromisedPackage[],
    repositories: CompromisedRepository[],
  ): void {
    for (const pkg of packages) {
      this.packages.set(this.packageKey(pkg.name, pkg.ecosystem), pkg);
    }
    for (const repo of repositories) {
      this.repositories.set(repo.fullName.toLowerCase(), repo);
    }
    this.lastSyncedAt = new Date().toISOString();
    void this.persistCache();
  }

  markSynced(): void {
    this.lastSyncedAt = new Date().toISOString();
    void this.persistCache();
  }

  private async loadCache(): Promise<void> {
    try {
      const raw = await readFile(this.cachePath, 'utf-8');
      const data = JSON.parse(raw) as {
        lastSyncedAt?: string;
        packages?: CompromisedPackage[];
        repositories?: CompromisedRepository[];
      };
      if (data.lastSyncedAt) this.lastSyncedAt = data.lastSyncedAt;
      for (const pkg of data.packages ?? []) {
        this.packages.set(this.packageKey(pkg.name, pkg.ecosystem), pkg);
      }
      for (const repo of data.repositories ?? []) {
        this.repositories.set(repo.fullName.toLowerCase(), repo);
      }
      this.logger.log(
        `Threat intel cache carregado (${this.packages.size} pacotes)`,
      );
    } catch {
      // cache ausente — baseline only
    }
  }

  private async persistCache(): Promise<void> {
    try {
      await mkdir(join(this.cachePath, '..'), { recursive: true });
      await writeFile(
        this.cachePath,
        JSON.stringify(
          {
            version: 1,
            lastSyncedAt: this.lastSyncedAt,
            packages: this.getPackages().filter((p) => p.source !== 'baseline'),
            repositories: this.getRepositories().filter(
              (r) => r.source !== 'baseline',
            ),
          },
          null,
          2,
        ),
        'utf-8',
      );
    } catch (err) {
      this.logger.warn(
        `Falha ao persistir threat intel cache: ${(err as Error).message}`,
      );
    }
  }

  private seedBaseline(): void {
    for (const pkg of MIASMA_COMPROMISED_NPM_PACKAGES) {
      this.packages.set(this.packageKey(pkg, 'npm'), {
        name: pkg,
        ecosystem: 'npm',
        severity: 'critical',
        source: 'baseline',
        summary: 'Pacote comprometido — campanha Miasma/TeamPCP',
      });
    }

    for (const scope of MIASMA_COMPROMISED_NPM_SCOPES) {
      this.packages.set(this.packageKey(`${scope}/*`, 'npm'), {
        name: `${scope}/*`,
        ecosystem: 'npm',
        severity: 'high',
        source: 'baseline',
        summary: 'Escopo npm afetado — campanha Miasma/TeamPCP',
      });
    }

    for (const pkg of MIASMA_COMPROMISED_PYPI_PACKAGES) {
      for (const version of pkg.versions) {
        this.packages.set(this.packageKey(`${pkg.name}@${version}`, 'pip'), {
          name: pkg.name,
          ecosystem: 'pip',
          versionRange: version,
          severity: 'critical',
          source: 'baseline',
          summary: `Versão PyPI maliciosa ${version}`,
        });
      }
    }

    for (const repo of MIASMA_AFFECTED_REPOSITORIES) {
      this.repositories.set(repo.toLowerCase(), {
        fullName: repo,
        url: `https://github.com/${repo}`,
        severity: 'high',
        source: 'baseline',
        summary: 'Repositório oficial afetado — worm Miasma',
      });
    }
  }

  private packageKey(name: string, ecosystem: ThreatEcosystem): string {
    return `${ecosystem}:${name.toLowerCase()}`;
  }

  private versionMatches(version: string, range: string): boolean {
    if (range === version) return true;
    if (range === 'all') return true;
    return range.split(',').some((v) => v.trim() === version);
  }
}
