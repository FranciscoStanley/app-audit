import { Inject, Injectable } from '@nestjs/common';
import { GitHubRepositoryPort } from '../../domain/ports/github-repository.port';
import { OPEN_SOURCE_MALWARE_PORT } from '../../domain/ports/threat-intelligence.port';
import type { OpenSourceMalwarePort } from '../../domain/ports/threat-intelligence.port';
import { ThreatIntelligenceStore } from '../threat-intel/threat-intelligence.store';
import { GitHubRemediationFactory } from '../github/github-remediation.factory';
import { AdditionalSecurityScanner } from './additional-security.scanner';
import { ComprehensiveSecurityScanner } from './comprehensive-security.scanner';
import { MiasmaRepositoryScanner } from './miasma-repository.scanner';

@Injectable()
export class AuditScannerFactory {
  constructor(
    private readonly threatStore: ThreatIntelligenceStore,
    private readonly remediationFactory: GitHubRemediationFactory,
    @Inject(OPEN_SOURCE_MALWARE_PORT)
    private readonly osm: OpenSourceMalwarePort,
  ) {}

  create(
    github: GitHubRepositoryPort,
    accessToken?: string | null,
  ): ComprehensiveSecurityScanner {
    const miasma = new MiasmaRepositoryScanner(
      github,
      this.threatStore,
      this.osm,
    );
    const remediation = this.remediationFactory.create(accessToken);
    const additional = new AdditionalSecurityScanner(
      github,
      remediation,
      this.threatStore,
    );
    return new ComprehensiveSecurityScanner(miasma, additional);
  }
}
