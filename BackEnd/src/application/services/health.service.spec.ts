import { HealthService } from './health.service';
import { ThreatIntelligenceStore } from '../../infrastructure/threat-intel/threat-intelligence.store';

describe('HealthService', () => {
  it('retorna status ok em ambiente de teste com checks definidos', async () => {
    const threatIntel = {
      getStatus: () => ({
        lastSyncedAt: null,
        nextSyncAt: null,
        totalPackages: 1,
        totalRepositories: 1,
        githubAdvisoryEnabled: true,
        openSourceMalwareEnabled: false,
        refreshIntervalHours: 6,
      }),
    } as ThreatIntelligenceStore;

    const service = new HealthService(
      {
        get: (key: string) =>
          key === 'JWT_SECRET' ? 'x'.repeat(48) : undefined,
      } as never,
      threatIntel,
    );

    const result = await service.check();
    expect(result.service).toBe('app-audit');
    expect(result.checks.storage).toBeDefined();
    expect(result.checks.jwt?.status).toBe('ok');
  });
});
