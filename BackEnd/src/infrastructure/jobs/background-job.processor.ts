import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RunMiasmaAuditUseCase } from '../../application/use-cases/run-miasma-audit.use-case';
import { RemediationUseCase } from '../../application/use-cases/remediation.use-case';
import { BackgroundJob } from '../../domain/entities/background-job.entity';
import { BackgroundJobStore } from '../storage/background-job.store';

@Injectable()
export class BackgroundJobProcessor implements OnModuleInit {
  private readonly logger = new Logger(BackgroundJobProcessor.name);
  private draining = false;
  private scheduled = false;

  constructor(
    private readonly jobStore: BackgroundJobStore,
    private readonly auditUseCase: RunMiasmaAuditUseCase,
    private readonly remediationUseCase: RemediationUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    const recovered = await this.jobStore.recoverInterruptedJobs();
    if (recovered > 0) {
      this.logger.warn(
        `${recovered} job(s) marcado(s) como falha após reinício do servidor`,
      );
    }
    this.scheduleDrain();
  }

  schedule(jobId?: string): void {
    if (jobId) {
      this.logger.debug(`Job enfileirado: ${jobId}`);
    }
    this.scheduleDrain();
  }

  private scheduleDrain(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    setImmediate(() => {
      this.scheduled = false;
      void this.drainQueue();
    });
  }

  private async drainQueue(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      while (true) {
        const pending = await this.jobStore.findNextPending();
        if (!pending) break;
        await this.runJob(pending);
      }
    } finally {
      this.draining = false;
    }
  }

  private async runJob(job: BackgroundJob): Promise<void> {
    const running = await this.jobStore.markRunning(job.id);
    if (!running) return;

    this.logger.log(`Executando job ${job.id} (${job.type})`);

    try {
      switch (job.type) {
        case 'audit_run':
          await this.runAuditJob(running);
          break;
        case 'remediation_apply':
          await this.runRemediationJob(running);
          break;
        case 'remediation_apply_all':
          await this.runRemediationAllJob(running);
          break;
        default:
          await this.jobStore.markFailed(job.id, `Tipo de job desconhecido: ${job.type}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha inesperada no job';
      await this.jobStore.markFailed(job.id, message);
      this.logger.error(`Job ${job.id} falhou: ${message}`);
    }
  }

  private async runAuditJob(job: BackgroundJob): Promise<void> {
    const result = await this.auditUseCase.execute({
      userId: job.userId,
      saveReportPath: job.payload.saveReport
        ? 'docs/security/miasma-worm-audit-report.md'
        : undefined,
      onProgress: async (progress) => {
        await this.jobStore.updateProgress(job.id, {
          phase: 'scanning',
          current: progress.scanned,
          total: progress.total,
          message: progress.currentRepo,
        });
      },
    });

    await this.jobStore.markCompleted(job.id, {
      auditId: result.auditId,
      savedTo: result.savedTo,
      verdict: result.report.verdict,
      totalVulnerabilities: result.report.totalVulnerabilities,
    });
  }

  private async runRemediationJob(job: BackgroundJob): Promise<void> {
    const findingId = job.payload.findingId;
    if (!findingId) {
      await this.jobStore.markFailed(job.id, 'findingId ausente no payload');
      return;
    }

    await this.jobStore.updateProgress(job.id, {
      phase: 'remediating',
      current: 0,
      total: 1,
    });

    const result = await this.remediationUseCase.apply(findingId, job.userId);
    await this.jobStore.markCompleted(job.id, {
      findingId,
      success: result.success,
      message: result.message,
      pullRequestUrl: result.delivery?.pullRequestUrl,
      appliedSteps: result.appliedSteps,
      requiresManualSteps: result.requiresManualSteps,
      delivery: result.delivery,
      dependabot: result.dependabot,
    });
  }

  private async runRemediationAllJob(job: BackgroundJob): Promise<void> {
    const auditId = job.payload.auditId;
    if (!auditId) {
      await this.jobStore.markFailed(job.id, 'auditId ausente no payload');
      return;
    }

    const result = await this.remediationUseCase.applyAll(auditId, job.userId, {
      onProgress: async (progress) => {
        await this.jobStore.updateProgress(job.id, {
          phase: 'remediating',
          current: progress.completed,
          total: progress.total,
          message: progress.currentFindingId,
        });
      },
    });

    await this.jobStore.markCompleted(job.id, {
      auditId,
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results,
    });
  }
}
