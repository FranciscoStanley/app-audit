import { Injectable } from '@nestjs/common';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  BackgroundJob,
  BackgroundJobProgress,
  BackgroundJobStatus,
  BackgroundJobType,
  BackgroundJobPayload,
} from '../../domain/entities/background-job.entity';
import {
  paginateArray,
  type PaginatedResult,
} from '../../domain/pagination/pagination';

export interface CreateBackgroundJobInput {
  type: BackgroundJobType;
  userId: string;
  label: string;
  payload: BackgroundJobPayload;
}

@Injectable()
export class BackgroundJobStore {
  private readonly baseDir = join(process.cwd(), 'data', 'jobs');

  async create(input: CreateBackgroundJobInput): Promise<BackgroundJob> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const job: BackgroundJob = {
      id,
      type: input.type,
      userId: input.userId,
      status: 'pending',
      label: input.label,
      payload: input.payload,
      createdAt: now,
      updatedAt: now,
    };
    await this.save(job);
    return job;
  }

  async save(job: BackgroundJob): Promise<void> {
    const dir = join(this.baseDir, job.id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'job.json'),
      JSON.stringify(job, null, 2),
      'utf-8',
    );
  }

  async getById(id: string): Promise<BackgroundJob | null> {
    try {
      const content = await readFile(
        join(this.baseDir, id, 'job.json'),
        'utf-8',
      );
      return JSON.parse(content) as BackgroundJob;
    } catch {
      return null;
    }
  }

  async listByUser(
    userId: string,
    status?: BackgroundJobStatus,
  ): Promise<BackgroundJob[]> {
    const jobs = await this.listAllForUser(userId);
    return jobs
      .filter((j) => !status || j.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listByUserPaginated(
    userId: string,
    page: number,
    pageSize: number,
    status?: BackgroundJobStatus,
  ): Promise<PaginatedResult<BackgroundJob>> {
    const filtered = (await this.listAllForUser(userId))
      .filter((j) => !status || j.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginateArray(filtered, page, pageSize);
  }

  async findActiveByUserAndType(
    userId: string,
    type: BackgroundJobType,
  ): Promise<BackgroundJob | null> {
    const jobs = await this.listByUser(userId);
    return (
      jobs.find(
        (j) =>
          j.type === type &&
          (j.status === 'pending' || j.status === 'running') &&
          this.samePayloadScope(j, type),
      ) ?? null
    );
  }

  async findNextPending(): Promise<BackgroundJob | null> {
    const jobs = await this.listAll();
    return (
      jobs
        .filter((j) => j.status === 'pending')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ?? null
    );
  }

  async markRunning(id: string): Promise<BackgroundJob | null> {
    const job = await this.getById(id);
    if (!job || job.status !== 'pending') return null;
    const now = new Date().toISOString();
    job.status = 'running';
    job.startedAt = now;
    job.updatedAt = now;
    await this.save(job);
    return job;
  }

  async updateProgress(
    id: string,
    progress: BackgroundJobProgress,
  ): Promise<void> {
    const job = await this.getById(id);
    if (!job) return;
    job.progress = progress;
    job.updatedAt = new Date().toISOString();
    await this.save(job);
  }

  async markCompleted(
    id: string,
    result: Record<string, unknown>,
  ): Promise<BackgroundJob | null> {
    const job = await this.getById(id);
    if (!job) return null;
    const now = new Date().toISOString();
    job.status = 'completed';
    job.result = result;
    job.error = undefined;
    job.completedAt = now;
    job.updatedAt = now;
    await this.save(job);
    return job;
  }

  async markFailed(id: string, error: string): Promise<BackgroundJob | null> {
    const job = await this.getById(id);
    if (!job) return null;
    const now = new Date().toISOString();
    job.status = 'failed';
    job.error = error;
    job.completedAt = now;
    job.updatedAt = now;
    await this.save(job);
    return job;
  }

  async recoverInterruptedJobs(): Promise<number> {
    const jobs = await this.listAll();
    let count = 0;
    for (const job of jobs) {
      if (job.status !== 'running') continue;
      await this.markFailed(
        job.id,
        'Execução interrompida (reinício do servidor). Inicie novamente se necessário.',
      );
      count++;
    }
    return count;
  }

  private async listAllForUser(userId: string): Promise<BackgroundJob[]> {
    try {
      const dirs = await readdir(this.baseDir);
      const jobs: BackgroundJob[] = [];
      for (const id of dirs) {
        const job = await this.getById(id);
        if (job && job.userId === userId) jobs.push(job);
      }
      return jobs;
    } catch {
      return [];
    }
  }

  private async listAll(): Promise<BackgroundJob[]> {
    try {
      const dirs = await readdir(this.baseDir);
      const jobs: BackgroundJob[] = [];
      for (const id of dirs) {
        const job = await this.getById(id);
        if (job) jobs.push(job);
      }
      return jobs;
    } catch {
      return [];
    }
  }

  private samePayloadScope(
    job: BackgroundJob,
    type: BackgroundJobType,
  ): boolean {
    if (type === 'remediation_apply') {
      return Boolean(job.payload.findingId);
    }
    if (type === 'remediation_apply_all') {
      return Boolean(job.payload.auditId);
    }
    return true;
  }
}
