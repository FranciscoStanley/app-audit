import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Permissions } from './decorators/permissions.decorator';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../../application/use-cases/auth.service';
import { GitHubAuthUseCase } from '../../application/use-cases/github-auth.use-case';
import { GitHubConsentUseCase } from '../../application/use-cases/github-consent.use-case';
import { LoginConsentUseCase } from '../../application/use-cases/login-consent.use-case';
import { UsersService } from '../../infrastructure/auth/users.service';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole, type User } from '../../domain/entities/user.entity';
import {
  AuthResponseDto,
  GitHubConsentAcceptDto,
  GitHubExchangeDto,
  GitHubStatusDto,
  LoginDto,
} from './dto/auth.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { PaginatedResult } from '../../domain/pagination/pagination';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly githubAuth: GitHubAuthUseCase,
    private readonly githubConsent: GitHubConsentUseCase,
    private readonly loginConsent: LoginConsentUseCase,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Autenticar com email e senha (JWT)' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.login(
      dto.email,
      dto.password,
      {
        termsAccepted: dto.termsAccepted,
        privacyAccepted: dto.privacyAccepted,
        dataProcessingAccepted: dto.termsAccepted && dto.privacyAccepted,
      },
      { ip: req.ip, userAgent: req.headers['user-agent'] },
    );
  }

  @Get('legal/info')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Informações legais públicas (versão de política, contatos)',
  })
  legalInfo() {
    return this.githubConsent.getLegalInfo();
  }

  @Get('login/consent')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Informações de consentimento para login por e-mail',
  })
  loginConsentInfo() {
    return this.loginConsent.getLoginConsentInfo();
  }

  @Get('github/config')
  @SkipThrottle()
  @ApiOperation({ summary: 'Verificar se login GitHub OAuth está habilitado' })
  githubConfig() {
    return { enabled: this.githubAuth.isEnabled() };
  }

  @Get('github/consent')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Informações de consentimento LGPD para login GitHub',
  })
  githubConsentInfo() {
    return this.githubConsent.getConsentInfo();
  }

  @Post('github/consent/accept')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Registrar aceite LGPD e obter URL de autorização GitHub',
  })
  githubConsentAccept(
    @Body() dto: GitHubConsentAcceptDto,
    @Req() req: Request,
  ) {
    return this.githubConsent.acceptConsent({
      acknowledgments: {
        termsAccepted: dto.termsAccepted,
        privacyAccepted: dto.privacyAccepted,
        dataProcessingAccepted: dto.dataProcessingAccepted,
        scopesAcknowledged: dto.scopesAcknowledged,
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('github')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'OAuth GitHub — exige consentimento prévio via POST /auth/github/consent/accept',
  })
  githubLogin(@Res() res: Response) {
    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    return res.redirect(`${frontend}/login?oauth=consent_required`);
  }

  @Delete('github/disconnect')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Revogar conexão GitHub e consentimento (direito do titular — LGPD)',
  })
  async githubDisconnect(@CurrentUser() user: { id: string }) {
    await this.githubAuth.disconnectGitHub(user.id);
    return {
      disconnected: true,
      message: 'Conexão GitHub revogada com sucesso.',
    };
  }

  @Get('github/callback')
  @SkipThrottle()
  @ApiOperation({
    summary:
      'Callback OAuth GitHub — redireciona ao frontend com código de uso único',
  })
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
  githubExchange(@Body() dto: GitHubExchangeDto): AuthResponseDto {
    return this.githubAuth.exchangeCode(dto.code);
  }

  @Get('github/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status da conexão GitHub do usuário' })
  @ApiResponse({ status: 200, type: GitHubStatusDto })
  async githubStatus(
    @CurrentUser() user: { id: string },
  ): Promise<GitHubStatusDto> {
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
  me(
    @CurrentUser()
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    },
  ) {
    return user;
  }

  @Get('users')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Permissions('users:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuários (admin, paginado)' })
  listUsers(
    @Query() query: PaginationQueryDto,
  ): PaginatedResult<Omit<User, 'passwordHash'>> {
    const { page, pageSize } = query.toParams();
    return this.usersService.listUsersPaginated(page, pageSize);
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
