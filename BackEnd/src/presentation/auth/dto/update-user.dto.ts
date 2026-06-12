import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../domain/entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Auditor de Segurança' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    minLength: 12,
    description: 'Nova senha (somente contas locais; omitir para manter)',
  })
  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password?: string;
}
