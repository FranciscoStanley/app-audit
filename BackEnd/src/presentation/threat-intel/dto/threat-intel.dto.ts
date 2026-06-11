import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ThreatIntelStatusDto {
  @ApiProperty({ nullable: true })
  lastSyncedAt!: string | null;

  @ApiProperty({ nullable: true })
  nextSyncAt!: string | null;

  @ApiProperty()
  totalPackages!: number;

  @ApiProperty()
  totalRepositories!: number;

  @ApiProperty()
  githubAdvisoryEnabled!: boolean;

  @ApiProperty()
  openSourceMalwareEnabled!: boolean;

  @ApiProperty()
  refreshIntervalHours!: number;
}

export class SyncThreatIntelResponseDto {
  @ApiProperty()
  syncedAt!: string;

  @ApiProperty()
  githubAdvisoriesCount!: number;

  @ApiProperty()
  osmLatestCount!: number;

  @ApiProperty()
  totalPackages!: number;

  @ApiProperty()
  totalRepositories!: number;

  @ApiProperty({ type: [String] })
  sources!: string[];

  @ApiProperty({ type: [String] })
  errors!: string[];
}

export class CheckAssetQueryDto {
  @ApiProperty({ enum: ['package', 'repository', 'domain'] })
  @IsIn(['package', 'repository', 'domain'])
  reportType!: 'package' | 'repository' | 'domain';

  @ApiProperty({ example: 'durabletask' })
  @IsString()
  resourceIdentifier!: string;

  @ApiPropertyOptional({ example: 'pypi' })
  @IsOptional()
  @IsString()
  ecosystem?: string;

  @ApiPropertyOptional({ example: '1.4.1' })
  @IsOptional()
  @IsString()
  version?: string;
}

export class CompromisedPackageDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  ecosystem!: string;

  @ApiPropertyOptional()
  versionRange?: string;

  @ApiProperty()
  severity!: string;

  @ApiProperty()
  source!: string;

  @ApiPropertyOptional()
  ghsaId?: string;

  @ApiPropertyOptional()
  summary?: string;

  @ApiPropertyOptional()
  referenceUrl?: string;
}
