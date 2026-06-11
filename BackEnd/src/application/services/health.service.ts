import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import { LEGAL_POLICY_VERSION } from '../../domain/constants/legal-policy.constants';
import { isProduction } from '../../config/env.validation';
import { ThreatIntelligenceStore } from '../../infrastructure/threat-intel/threat-intelligence.store';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  checks: Record<string, { status: 'ok' | 'warn' | 'fail'; message?: string }>;
}

@Injectable()
export class HealthService {
  private readonly dataDir = join(process.cwd(), 'data');

  constructor(
    private readonly config: ConfigService,
    private readonly threatIntel: ThreatIntelligenceStore,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};
    let overall: HealthCheckResult['status'] = 'ok';

    checks.storage = await this.checkWritableDataDir();
    if (checks.storage.status === 'fail') overall = 'error';
    else if (checks.storage.status === 'warn' && overall === 'ok')
      overall = 'degraded';

    checks.jwt = this.checkJwtSecret();
    if (checks.jwt.status === 'fail') overall = 'error';

    checks.github = this.checkGitHubToken();
    if (checks.github.status === 'warn' && overall === 'ok')
      overall = 'degraded';

    checks.threatIntel = this.checkThreatIntel();
    if (checks.threatIntel.status === 'warn' && overall === 'ok')
      overall = 'degraded';

    return {
      status: overall,
      service: 'app-audit',
      version: LEGAL_POLICY_VERSION,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async checkWritableDataDir(): Promise<
    HealthCheckResult['checks'][string]
  > {
    try {
      await access(this.dataDir, constants.W_OK | constants.R_OK);
      return { status: 'ok' };
    } catch {
      try {
        const { mkdir } = await import('node:fs/promises');
        await mkdir(this.dataDir, { recursive: true });
        return { status: 'ok', message: 'Diretório data/ criado' };
      } catch {
        return {
          status: 'fail',
          message: 'Diretório data/ inacessível ou somente leitura',
        };
      }
    }
  }

  private checkJwtSecret(): HealthCheckResult['checks'][string] {
    const secret = this.config.get<string>('JWT_SECRET')?.trim();
    if (!secret || secret.length < 32) {
      return isProduction()
        ? {
            status: 'fail',
            message: 'JWT_SECRET ausente ou curto (< 32 caracteres)',
          }
        : {
            status: 'warn',
            message: 'JWT_SECRET de desenvolvimento — não use em produção',
          };
    }
    return { status: 'ok' };
  }

  private checkGitHubToken(): HealthCheckResult['checks'][string] {
    if (this.config.get<string>('GITHUB_TOKEN')?.trim()) {
      return { status: 'ok' };
    }
    return isProduction()
      ? { status: 'fail', message: 'GITHUB_TOKEN não configurado' }
      : {
          status: 'warn',
          message: 'GITHUB_TOKEN ausente — auditorias GitHub indisponíveis',
        };
  }

  private checkThreatIntel(): HealthCheckResult['checks'][string] {
    const status = this.threatIntel.getStatus();
    if (!status.lastSyncedAt) {
      return { status: 'warn', message: 'Threat intel ainda não sincronizado' };
    }
    return { status: 'ok', message: `Último sync: ${status.lastSyncedAt}` };
  }
}
