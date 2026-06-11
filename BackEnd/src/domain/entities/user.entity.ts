export enum UserRole {
  ADMIN = 'admin',
  AUDITOR = 'auditor',
  VIEWER = 'viewer',
}

export type AuthProvider = 'local' | 'github';

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  name: string;
  role: UserRole;
  authProvider?: AuthProvider;
  githubId?: string;
  githubUsername?: string;
}
