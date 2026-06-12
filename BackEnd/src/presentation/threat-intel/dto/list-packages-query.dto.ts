import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListPackagesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['npm', 'pip'] })
  @IsOptional()
  @IsString()
  ecosystem?: string;
}
