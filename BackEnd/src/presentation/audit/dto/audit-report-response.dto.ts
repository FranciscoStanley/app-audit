import { ApiProperty } from '@nestjs/swagger';

export class ThreatFindingDto {
  @ApiProperty({ enum: ['malicious_file', 'malicious_pattern', 'compromised_dependency', 'compromised_action', 'cloned_affected_repo'] })
  type!: string;

  @ApiProperty({ enum: ['critical', 'high', 'medium', 'low', 'info'] })
  severity!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ required: false })
  evidence?: string;
}

export class RepositoryScanDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  isPrivate!: boolean;

  @ApiProperty()
  url!: string;

  @ApiProperty({ nullable: true })
  language!: string | null;

  @ApiProperty({ type: [String] })
  topics!: string[];

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: [ThreatFindingDto] })
  findings!: ThreatFindingDto[];

  @ApiProperty()
  isAffected!: boolean;
}

export class TechnologySummaryDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  repositoryCount!: number;

  @ApiProperty()
  affectedCount!: number;

  @ApiProperty({ enum: ['none', 'low', 'medium', 'high', 'critical'] })
  riskLevel!: string;
}

export class ImmediateActionDto {
  @ApiProperty()
  priority!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  category!: string;
}

export class ThreatIntelSummaryDto {
  @ApiProperty({ nullable: true })
  lastSyncedAt!: string | null;

  @ApiProperty()
  totalPackages!: number;

  @ApiProperty()
  totalRepositories!: number;

  @ApiProperty()
  githubAdvisoryEnabled!: boolean;

  @ApiProperty()
  openSourceMalwareEnabled!: boolean;
}

export class AuditReportResponseDto {
  @ApiProperty()
  auditedAt!: string;

  @ApiProperty()
  githubUsername!: string;

  @ApiProperty()
  totalRepositories!: number;

  @ApiProperty()
  publicRepositories!: number;

  @ApiProperty()
  privateRepositories!: number;

  @ApiProperty({ type: [RepositoryScanDto] })
  affectedRepositories!: RepositoryScanDto[];

  @ApiProperty()
  cleanRepositories!: number;

  @ApiProperty({ type: [TechnologySummaryDto] })
  technologies!: TechnologySummaryDto[];

  @ApiProperty({ type: [ImmediateActionDto] })
  immediateActions!: ImmediateActionDto[];

  @ApiProperty()
  sourceReference!: string;

  @ApiProperty({ enum: ['affected', 'not_affected', 'inconclusive'] })
  verdict!: string;

  @ApiProperty({ type: [String] })
  limitations!: string[];

  @ApiProperty({ type: ThreatIntelSummaryDto })
  threatIntel!: ThreatIntelSummaryDto;
}

export class AuditRunResponseDto {
  @ApiProperty({ type: AuditReportResponseDto })
  report!: AuditReportResponseDto;

  @ApiProperty({ required: false })
  savedTo?: string;

  @ApiProperty({ required: false })
  auditId?: string;
}
