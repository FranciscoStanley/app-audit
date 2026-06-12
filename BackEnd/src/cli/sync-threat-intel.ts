import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SyncThreatIntelligenceUseCase } from '../application/use-cases/sync-threat-intelligence.use-case';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const useCase = app.get(SyncThreatIntelligenceUseCase);
    const result = await useCase.execute();

    console.log('\n══════════════════════════════════════════════════');
    console.log('  Threat Intelligence sincronizado');
    console.log(`  GitHub Advisories: ${result.githubAdvisoriesCount}`);
    console.log(`  OpenSourceMalware: ${result.osmLatestCount}`);
    console.log(`  Total pacotes:     ${result.totalPackages}`);
    console.log(`  Fontes:            ${result.sources.join(', ')}`);
    if (result.errors.length) {
      console.log(`  Avisos:            ${result.errors.join(' | ')}`);
    }
    console.log('══════════════════════════════════════════════════\n');
  } finally {
    await app.close();
  }
}

main().catch((err: unknown) => {
  console.error(
    'Falha na sincronização:',
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});
