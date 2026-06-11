import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Permissions } from './decorators/permissions.decorator';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../../application/use-cases/auth.service';
import { GitHubAuthUseCase } from '../../application/use-cases/github-auth.use-case';
import { UsersService } from '../../infrastructure/auth/users.service';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from '../../domain/entities/user.entity';
import { AuthResponseDto, GitHubExchangeDto, GitHubStatusDto, LoginDto } from './dto/auth.dto';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly githubAuth: GitHubAuthUseCase,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Autenticar com email e senha (JWT)' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('github/config')
  @SkipThrottle()
  @ApiOperation({ summary: 'Verificar se login GitHub OAuth está habilitado' })
  githubConfig() {
    return { enabled: this.githubAuth.isEnabled() };
  }

  @Get('github')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar login OAuth com GitHub' })
  githubLogin(@Res() res: Response) {
    return res.redirect(this.githubAuth.getAuthorizeUrl());
  }

  @Get('github/callback')
  @SkipThrottle()
  @ApiOperation({ summary: 'Callback OAuth GitHub — redireciona ao frontend com código de uso único' })
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const auth = await this.githubAuth.handleCallback(code, state);
    const redirect = this.githubAuth.getFrontendRedirectUrl(auth.accessToken);
    return res.redirect(redirect);
  }

  @Post('github/exchange')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Trocar código OAuth de uso único por JWT' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  githubExchange(@Body() dto: GitHubExchangeDto): Promise<AuthResponseDto> {
    return this.githubAuth.exchangeCode(dto.code);
  }

  @Get('github/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status da conexão GitHub do usuário' })
  @ApiResponse({ status: 200, type: GitHubStatusDto })
  async githubStatus(@CurrentUser() user: { id: string }): Promise<GitHubStatusDto> {
    const status = await this.githubAuth.getGitHubStatus(user.id);
    return {
      enabled: this.githubAuth.isEnabled(),
      ...status,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  me(@CurrentUser() user: { id: string; email: string; name: string; role: string }) {
    return user;
  }

  @Get('users')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Permissions('users:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuários (admin)' })
  listUsers() {
    return this.usersService.listUsers();
  }

  @Post('users')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Permissions('users:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar usuário (admin)' })
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }
}
