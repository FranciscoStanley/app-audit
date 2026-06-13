import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_GITHUB_USERNAME,
  DEFAULT_ADMIN_NAME,
  isConfiguredAdminProfile,
  resolveAdminIdentityConfig,
} from './admin-user.constants';

describe('admin-user.constants', () => {
  it('usa defaults do proprietário quando env está vazio', () => {
    expect(resolveAdminIdentityConfig({})).toEqual({
      adminEmail: DEFAULT_ADMIN_EMAIL,
      adminGithubUsername: DEFAULT_ADMIN_GITHUB_USERNAME,
      adminName: DEFAULT_ADMIN_NAME,
    });
  });

  it('identifica admin por email ou GitHub username', () => {
    const config = resolveAdminIdentityConfig({});

    expect(
      isConfiguredAdminProfile(
        { email: DEFAULT_ADMIN_EMAIL, githubUsername: 'other' },
        config,
      ),
    ).toBe(true);

    expect(
      isConfiguredAdminProfile(
        { email: 'other@example.com', githubUsername: DEFAULT_ADMIN_GITHUB_USERNAME },
        config,
      ),
    ).toBe(true);

    expect(
      isConfiguredAdminProfile(
        { email: 'other@example.com', githubUsername: 'other' },
        config,
      ),
    ).toBe(false);
  });
});
