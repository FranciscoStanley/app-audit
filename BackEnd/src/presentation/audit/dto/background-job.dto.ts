import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { BackgroundJobStatus } from '../../../domain/entities/background-job.entity';

export class ListJobsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'running', 'completed', 'failed'] })
  @IsOptional()
  @IsEnum(['pending', 'running', 'completed', 'failed'])
  status?: BackgroundJobStatus;
}

export class BackgroundJobProgressDto {
  @ApiProperty({ example: 'scanning' })
  phase!: string;

  @ApiProperty({ example: 3 })
  current!: number;

  @ApiProperty({ example: 10 })
  total!: number;

  @ApiPropertyOptional({ example: 'org/repo' })
  message?: string;
}

export class BackgroundJobResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: ['audit_run', 'remediation_apply', 'remediation_apply_all'],
  })
  type!: string;

  @ApiProperty({
    enum: ['pending', 'running', 'completed', 'failed'],
  })
  status!: string;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional()
  findingId?: string;

  @ApiPropertyOptional()
  auditId?: string;

  @ApiPropertyOptional({ type: BackgroundJobProgressDto })
  progress?: BackgroundJobProgressDto;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  result?: Record<string, unknown>;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional()
  startedAt?: string;

  @ApiPropertyOptional()
  completedAt?: string;
}

export class CreateBackgroundJobResponseDto {
  @ApiProperty()
  jobId!: string;

  @ApiProperty({ enum: ['pending', 'running'] })
  status!: string;
}

export class CreateRemediationJobDto {
  @ApiProperty()
  findingId!: string;
}

export class CreateRemediationAllJobDto {
  @ApiProperty()
  auditId!: string;
}
