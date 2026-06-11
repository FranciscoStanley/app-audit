import { Injectable } from '@nestjs/common';
import { RepositoryScan } from '../../domain/entities/repository-scan.entity';
import type { GitHubRepositoryInfo } from '../../domain/ports/github-repository.port';
import { AdditionalSecurityScanner } from './additional-security.scanner';
import { MiasmaRepositoryScanner } from './miasma-repository.scanner';

@Injectable()
export class ComprehensiveSecurityScanner {
  constructor(
    private readonly miasmaScanner: MiasmaRepositoryScanner,
    private readonly additionalScanner: AdditionalSecurityScanner,
  ) {}

  async scan(repo: GitHubRepositoryInfo): Promise<RepositoryScan> {
    const miasmaResult = await this.miasmaScanner.scan(repo);
    const additionalFindings = await this.additionalScanner.scan(repo);

    const findings = [...miasmaResult.findings, ...additionalFindings];
    const isAffected = findings.some((f) =>
      ['critical', 'high'].includes(f.severity),
    );

    return {
      ...miasmaResult,
      findings,
      isAffected,
      vulnerabilityCount: findings.length,
    };
  }
}
