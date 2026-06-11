import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BackgroundJobUseCase } from './background-job.use-case';
import { BackgroundJobStore } from '../../infrastructure/storage/background-job.store';
import { BackgroundJobProcessor } from '../../infrastructure/jobs/background-job.processor';
import { BackgroundJob } from '../../domain/entities/background-job.entity';

describe('BackgroundJobUseCase', () => {
  let useCase: BackgroundJobUseCase;
  let jobStore: jest.Mocked<
    Pick<
      BackgroundJobStore,
      'create' | 'getById' | 'listByUser'
    >
  >;
  let processor: jest.Mocked<Pick<BackgroundJobProcessor, 'schedule'>>;

  const userId = 'user-1';

  beforeEach(() => {
    jobStore = {
      create: jest.fn(),
      getById: jest.fn(),
      listByUser: jest.fn().mockResolvedValue([]),
    };
    processor = {
      schedule: jest.fn(),
    };
    useCase = new BackgroundJobUseCase(
      jobStore as unknown as BackgroundJobStore,
      processor as unknown as BackgroundJobProcessor,
    );
  });

  it('creates audit job and schedules processor', async () => {
    const job: BackgroundJob = {
      id: 'job-1',
      type: 'audit_run',
      userId,
      status: 'pending',
      label: 'Varredura de vulnerabilidades',
      payload: { saveReport: true },
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    jobStore.create.mockResolvedValue(job);

    const result = await useCase.createAuditJob(userId);

    expect(result.id).toBe('job-1');
    expect(processor.schedule).toHaveBeenCalledWith('job-1');
  });

  it('returns active audit job instead of creating duplicate', async () => {
    const active: BackgroundJob = {
      id: 'job-active',
      type: 'audit_run',
      userId,
      status: 'running',
      label: 'Varredura de vulnerabilidades',
      payload: { saveReport: true },
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    jobStore.listByUser.mockResolvedValue([active]);

    const result = await useCase.createAuditJob(userId);

    expect(result.id).toBe('job-active');
    expect(jobStore.create).not.toHaveBeenCalled();
  });

  it('denies access to job from another user', async () => {
    jobStore.getById.mockResolvedValue({
      id: 'job-1',
      type: 'audit_run',
      userId: 'other-user',
      status: 'completed',
      label: 'Varredura',
      payload: {},
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    });

    await expect(useCase.getJob(userId, 'job-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws when job is missing', async () => {
    jobStore.getById.mockResolvedValue(null);
    await expect(useCase.getJob(userId, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
