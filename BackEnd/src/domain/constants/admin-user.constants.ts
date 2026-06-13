export const DEFAULT_ADMIN_NAME = 'Francisco Stanley Rodrigues Albuquerque';
export const DEFAULT_ADMIN_EMAIL = 'franciscothestanley@gmail.com';
export const DEFAULT_ADMIN_GITHUB_USERNAME = 'FranciscoStanley';

export interface AdminIdentityConfig {
  adminEmail: string;
  adminGithubUsername: string;
  adminName: string;
}

export function resolveAdminIdentityConfig(env: {
  adminEmail?: string;
  adminName?: string;
  adminGithubUsername?: string;
}): AdminIdentityConfig {
  return {
    adminEmail: (env.adminEmail?.trim() || DEFAULT_ADMIN_EMAIL).toLowerCase(),
    adminGithubUsername:
      env.adminGithubUsername?.trim() || DEFAULT_ADMIN_GITHUB_USERNAME,
    adminName: env.adminName?.trim() || DEFAULT_ADMIN_NAME,
  };
}

export function isConfiguredAdminProfile(
  profile: { email: string; githubUsername?: string },
  config: Pick<AdminIdentityConfig, 'adminEmail' | 'adminGithubUsername'>,
): boolean {
  if (profile.email.toLowerCase() === config.adminEmail) {
    return true;
  }

  const githubUsername = profile.githubUsername?.trim().toLowerCase();
  return (
    githubUsername !== undefined &&
    githubUsername === config.adminGithubUsername.toLowerCase()
  );
}
