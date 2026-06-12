import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateRemediationAllJobDto,
  CreateRemediationJobDto,
} from './background-job.dto';

describe('Background job request DTOs', () => {
  it('CreateRemediationAllJobDto accepts auditId', async () => {
    const dto = plainToInstance(CreateRemediationAllJobDto, {
      auditId: 'audit-123',
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('CreateRemediationAllJobDto rejects empty auditId', async () => {
    const dto = plainToInstance(CreateRemediationAllJobDto, { auditId: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'auditId')).toBe(true);
  });

  it('CreateRemediationJobDto accepts findingId', async () => {
    const dto = plainToInstance(CreateRemediationJobDto, {
      findingId: 'finding-456',
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
