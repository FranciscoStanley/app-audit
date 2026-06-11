import { UserRole } from '../entities/user.entity';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: [
    'audit:run',
    'audit:read',
    'audit:download',
    'remediation:apply',
    'remediation:preview',
    'threat-intel:sync',
    'threat-intel:read',
    'users:manage',
  ],
  [UserRole.AUDITOR]: [
    'audit:run',
    'audit:read',
    'audit:download',
    'remediation:apply',
    'remediation:preview',
    'threat-intel:sync',
    'threat-intel:read',
  ],
  [UserRole.VIEWER]: ['audit:read', 'audit:download', 'threat-intel:read'],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
