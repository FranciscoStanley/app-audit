import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class AuditReportSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  githubUsername!: string;

  @ApiProperty()
  verdict!: string;

  @ApiProperty()
  totalVulnerabilities!: number;

  @ApiProperty()
  repositoryCount!: number;
}

export class ListFindingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por categoria exata' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por severidade (critical, high, medium, low)',
  })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({
    description: 'Somente findings com remediação automática disponível',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  remediationAvailable?: boolean;
}
