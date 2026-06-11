import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  CompromisedPackage,
  CompromisedRepository,
  ThreatIntelSyncResult,
} from '../../domain/entities/threat-intelligence.entity';
import {
  GITHUB_ADVISORY_PORT,
  OPEN_SOURCE_MALWARE_PORT,
} from '../../domain/ports/threat-intelligence.port';
import type {
  GitHubAdvisoryPort,
  OpenSourceMalwarePort,
} from '../../domain/ports/threat-intelligence.port';
import { ThreatIntelligenceStore } from '../../infrastructure/threat-intel/threat-intelligence.store';

@Injectable()
export class SyncThreatIntelligenceUseCase {
  private readonly logger = new Logger(SyncThreatIntelligenceUseCase.name);

  constructor(
    @Inject(GITHUB_ADVISORY_PORT)
    private readonly githubAdvisory: GitHubAdvisoryPort,
    @Inject(OPEN_SOURCE_MALWARE_PORT)
    private readonly osm: OpenSourceMalwarePort,
    private readonly store: ThreatIntelligenceStore,
  ) {}

  async execute(): Promise<ThreatIntelSyncResult> {
    const errors: string[] = [];
    const sources: string[] = ['baseline'];
    let githubCount = 0;
    let osmCount = 0;

    const packages: CompromisedPackage[] = [];
    const repositories: CompromisedRepository[] = [];

    try {
      const advisories = await this.githubAdvisory.fetchMalwareAdvisories();
      githubCount = advisories.length;
      sources.push('github_advisory');

      for (const advisory of advisories) {
        for (const pkg of advisory.packages) {
          if (!pkg.name) continue;
          packages.push({
            name: pkg.name,
            ecosystem: this.mapEcosystem(pkg.ecosystem),
            versionRange: pkg.vulnerableVersionRange ?? undefined,
            severity: this.mapSeverity(advisory.severity),
            source: 'github_advisory',
            ghsaId: advisory.ghsaId,
            cveId: advisory.cveId ?? undefined,
            summary: advisory.summary,
            referenceUrl: advisory.htmlUrl,
            publishedAt: advisory.publishedAt,
          });
        }
      }
    } catch (error) {
      const message = `GitHub Advisory Database: ${(error as Error).message}`;
      errors.push(message);
      this.logger.error(message);
    }

    try {
      if (this.osm.fetchLatestThreats) {
        const latest = await this.osm.fetchLatestThreats();
        osmCount = latest.length;
        if (latest.length > 0) sources.push('opensource_malware');
        packages.push(...latest);
      }
    } catch (error) {
      const message = `OpenSourceMalware query-latest: ${(error as Error).message}`;
      errors.push(message);
      this.logger.warn(message);
    }

    this.store.applySync(packages, repositories);

    const result: ThreatIntelSyncResult = {
      syncedAt: new Date().toISOString(),
      githubAdvisoriesCount: githubCount,
      osmLatestCount: osmCount,
      totalPackages: this.store.getPackages().length,
      totalRepositories: this.store.getRepositories().length,
      sources: [...new Set(sources)],
      errors,
    };

    this.logger.log(
      `Threat intel sincronizado: ${result.totalPackages} pacotes, ${result.totalRepositories} repos`,
    );

    return result;
  }

  private mapEcosystem(value: string): CompromisedPackage['ecosystem'] {
    const map: Record<string, CompromisedPackage['ecosystem']> = {
      npm: 'npm',
      pip: 'pip',
      maven: 'maven',
      nuget: 'nuget',
      composer: 'composer',
      go: 'go',
      rust: 'rust',
      actions: 'actions',
      rubygems: 'rubygems',
    };
    return map[value.toLowerCase()] ?? 'other';
  }

  private mapSeverity(value: string): CompromisedPackage['severity'] {
    const allowed = ['critical', 'high', 'medium', 'low', 'unknown'] as const;
    const normalized = value.toLowerCase() as CompromisedPackage['severity'];
    return allowed.includes(normalized) ? normalized : 'unknown';
  }
}
