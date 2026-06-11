import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class GitHubExchangeDto {
  @ApiProperty({ description: 'Código de uso único retornado pelo callback OAuth' })
  @IsString()
  @MinLength(16)
  @MaxLength(128)
  code!: string;
}

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ required: false })
  githubConnected?: boolean;

  @ApiProperty({ required: false })
  githubUsername?: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class GitHubStatusDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  connected!: boolean;

  @ApiProperty({ nullable: true })
  githubUsername!: string | null;

  @ApiProperty({ nullable: true })
  connectedAt!: string | null;
}
