import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResult } from '../../domain/pagination/pagination';
import {
  BackgroundJob,
  BackgroundJobStatus,
} from '../../domain/entities/background-job.entity';
import { BackgroundJobStore } from '../../infrastructure/storage/background-job.store';
import { BackgroundJobProcessor } from '../../infrastructure/jobs/background-job.processor';

@Injectable()
export class BackgroundJobUseCase {
  constructor(
    private readonly jobStore: BackgroundJobStore,
    private readonly processor: BackgroundJobProcessor,
  ) {}

  async createAuditJob(userId: string): Promise<BackgroundJob> {
    const jobs = await this.jobStore.listByUser(userId);
    const active = jobs.find(
      (j) =>
        j.type === 'audit_run' &&
        (j.status === 'pending' || j.status === 'running'),
    );
    if (active) return active;

    const job = await this.jobStore.create({
      type: 'audit_run',
      userId,
      label: 'Varredura de vulnerabilidades',
      payload: { saveReport: true },
    });
    this.processor.schedule(job.id);
    return job;
  }

  async createRemediationJob(
    userId: string,
    findingId: string,
  ): Promise<BackgroundJob> {
    const active = await this.findActiveRemediation(userId, findingId);
    if (active) return active;

    const job = await this.jobStore.create({
      type: 'remediation_apply',
      userId,
      label: `Remediação da vulnerabilidade ${findingId.slice(0, 8)}`,
      payload: { findingId },
    });
    this.processor.schedule(job.id);
    return job;
  }

  async createRemediationAllJob(
    userId: string,
    auditId: string,
  ): Promise<BackgroundJob> {
    const jobs = await this.jobStore.listByUser(userId);
    const active = jobs.find(
      (j) =>
        j.type === 'remediation_apply_all' &&
        j.payload.auditId === auditId &&
        (j.status === 'pending' || j.status === 'running'),
    );
    if (active) return active;

    const job = await this.jobStore.create({
      type: 'remediation_apply_all',
      userId,
      label: 'Remediação em lote',
      payload: { auditId },
    });
    this.processor.schedule(job.id);
    return job;
  }

  async getJob(userId: string, jobId: string): Promise<BackgroundJob> {
    const job = await this.jobStore.getById(jobId);
    if (!job) throw new NotFoundException('Job não encontrado');
    if (job.userId !== userId) throw new ForbiddenException('Acesso negado');
    return job;
  }

  async listJobs(
    userId: string,
    page: number,
    pageSize: number,
    status?: BackgroundJobStatus,
  ): Promise<PaginatedResult<BackgroundJob>> {
    return this.jobStore.listByUserPaginated(userId, page, pageSize, status);
  }

  private async findActiveRemediation(
    userId: string,
    findingId: string,
  ): Promise<BackgroundJob | null> {
    const jobs = await this.jobStore.listByUser(userId);
    return (
      jobs.find(
        (j) =>
          j.type === 'remediation_apply' &&
          j.payload.findingId === findingId &&
          (j.status === 'pending' || j.status === 'running'),
      ) ?? null
    );
  }
}
