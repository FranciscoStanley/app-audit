import { hasPermission } from './rbac.constants';
import { UserRole } from '../entities/user.entity';

describe('RBAC', () => {
  it('admin can run audits', () => {
    expect(hasPermission(UserRole.ADMIN, 'audit:run')).toBe(true);
  });

  it('viewer cannot run audits', () => {
    expect(hasPermission(UserRole.VIEWER, 'audit:run')).toBe(false);
  });

  it('viewer can read audits', () => {
    expect(hasPermission(UserRole.VIEWER, 'audit:read')).toBe(true);
  });
});
