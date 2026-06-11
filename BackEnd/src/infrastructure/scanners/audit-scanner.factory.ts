import { Inject, Injectable } from '@nestjs/common';
import { GitHubRepositoryPort } from '../../domain/ports/github-repository.port';
import { OPEN_SOURCE_MALWARE_PORT } from '../../domain/ports/threat-intelligence.port';
import type { OpenSourceMalwarePort } from '../../domain/ports/threat-intelligence.port';
import { ThreatIntelligenceStore } from '../threat-intel/threat-intelligence.store';
import { AdditionalSecurityScanner } from './additional-security.scanner';
import { ComprehensiveSecurityScanner } from './comprehensive-security.scanner';
import { MiasmaRepositoryScanner } from './miasma-repository.scanner';

@Injectable()
export class AuditScannerFactory {
  constructor(
    private readonly threatStore: ThreatIntelligenceStore,
    @Inject(OPEN_SOURCE_MALWARE_PORT) private readonly osm: OpenSourceMalwarePort,
  ) {}

  create(github: GitHubRepositoryPort): ComprehensiveSecurityScanner {
    const miasma = new MiasmaRepositoryScanner(github, this.threatStore, this.osm);
    const additional = new AdditionalSecurityScanner(github, this.threatStore);
    return new ComprehensiveSecurityScanner(miasma, additional);
  }
}
