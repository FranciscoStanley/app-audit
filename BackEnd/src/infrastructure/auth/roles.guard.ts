import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from '../../domain/constants/rbac.constants';
import { UserRole } from '../../domain/entities/user.entity';
import { ROLES_KEY } from '../../presentation/auth/decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../../presentation/auth/decorators/permissions.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length && !requiredPermissions?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.role) throw new ForbiddenException('Acesso negado');

    if (requiredRoles?.length && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Papel insuficiente para esta operação');
    }

    if (requiredPermissions?.length) {
      const allowed = requiredPermissions.every((p) =>
        hasPermission(user.role, p),
      );
      if (!allowed) throw new ForbiddenException('Permissão insuficiente');
    }

    return true;
  }
}
