import { ApiProperty } from '@nestjs/swagger';
import type { PaginatedResult, PaginationMeta } from '../../../domain/pagination/pagination';

export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty()
  hasPreviousPage!: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data!: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export function toPaginatedDto<T>(result: PaginatedResult<T>): PaginatedResult<T> {
  return result;
}
