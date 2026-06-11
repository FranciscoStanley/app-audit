export enum UserRole {
  ADMIN = 'admin',
  AUDITOR = 'auditor',
  VIEWER = 'viewer',
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
}
