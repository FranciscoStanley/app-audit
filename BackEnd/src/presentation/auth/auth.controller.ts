import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Permissions } from './decorators/permissions.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../../application/use-cases/auth.service';
import { UsersService } from '../../infrastructure/auth/users.service';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from '../../domain/entities/user.entity';
import { AuthResponseDto, LoginDto } from './dto/auth.dto';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Autenticar com email e senha (JWT)' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto.email, dto.password);
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
