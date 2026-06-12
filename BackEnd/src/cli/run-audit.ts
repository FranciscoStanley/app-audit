import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RunMiasmaAuditUseCase } from '../application/use-cases/run-miasma-audit.use-case';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const useCase = app.get(RunMiasmaAuditUseCase);
    const result = await useCase.execute({
      userId: 'cli',
      saveReportPath: 'docs/security/miasma-worm-audit-report.md',
    });

    console.log('\n══════════════════════════════════════════════════');
    console.log(`  Veredito: ${result.report.verdict.toUpperCase()}`);
    console.log(`  Repositórios: ${result.report.totalRepositories}`);
    console.log(`  Públicos: ${result.report.publicRepositories}`);
    console.log(`  Privados: ${result.report.privateRepositories}`);
    console.log(`  Afetados: ${result.report.affectedRepositories.length}`);
    console.log('══════════════════════════════════════════════════\n');

    if (result.savedTo) {
      console.log(`Relatório salvo: ${result.savedTo}`);
    }
  } finally {
    await app.close();
  }
}

main().catch((err: unknown) => {
  console.error(
    'Falha na auditoria:',
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});
