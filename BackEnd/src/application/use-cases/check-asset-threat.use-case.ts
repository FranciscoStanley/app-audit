import { Inject, Injectable } from '@nestjs/common';
import type { OsmCheckResult } from '../../domain/entities/threat-intelligence.entity';
import { OPEN_SOURCE_MALWARE_PORT } from '../../domain/ports/threat-intelligence.port';
import type { OpenSourceMalwarePort } from '../../domain/ports/threat-intelligence.port';
import { ThreatIntelligenceStore } from '../../infrastructure/threat-intel/threat-intelligence.store';

export interface CheckAssetInput {
  reportType: 'package' | 'repository' | 'domain';
  resourceIdentifier: string;
  ecosystem?: string;
  version?: string;
}

export interface CheckAssetOutput {
  localMatch: boolean;
  osmResult?: OsmCheckResult;
  references: string[];
}

@Injectable()
export class CheckAssetThreatUseCase {
  constructor(
    private readonly store: ThreatIntelligenceStore,
    @Inject(OPEN_SOURCE_MALWARE_PORT) private readonly osm: OpenSourceMalwarePort,
  ) {}

  async execute(input: CheckAssetInput): Promise<CheckAssetOutput> {
    const references = [
      'https://github.com/advisories',
      'https://opensourcemalware.com/',
      'https://docs.opensourcemalware.com/api/check-malicious',
    ];

    let localMatch = false;

    if (input.reportType === 'package' && input.ecosystem) {
      localMatch = Boolean(
        this.store.isPackageCompromised(
          input.resourceIdentifier,
          input.ecosystem as import('../../domain/entities/threat-intelligence.entity').ThreatEcosystem,
          input.version,
        ),
      );
    }

    if (input.reportType === 'repository') {
      const fullName = input.resourceIdentifier
        .replace('https://github.com/', '')
        .replace(/\/$/, '');
      localMatch = Boolean(this.store.isRepositoryCompromised(fullName));
    }

    let osmResult: OsmCheckResult | undefined;
    try {
      osmResult = await this.osm.checkMalicious({
        reportType: input.reportType,
        resourceIdentifier: input.resourceIdentifier,
        ecosystem: input.ecosystem,
        version: input.version,
      });
    } catch {
      osmResult = undefined;
    }

    return { localMatch, osmResult, references };
  }
}
