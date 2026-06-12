import {
  mapGitCloneFailure,
  sanitizeGitError,
} from './git-error.util';

describe('git-error.util', () => {
  it('redacts tokens from error messages', () => {
    const msg =
      'git clone https://x-access-token:gho_SECRET123@github.com/org/repo.git failed';
    expect(sanitizeGitError(msg)).not.toContain('gho_SECRET123');
    expect(sanitizeGitError(msg)).toContain('x-access-token:***@');
  });

  it('maps repository not found', () => {
    const err = new Error('remote: Repository not found.');
    expect(mapGitCloneFailure('brooklyn86', 'frontend-sistemaloja', 'main', err)).toMatch(
      /não encontrado|permissão/i,
    );
  });

  it('maps SSO errors', () => {
    const err = new Error('must authorize your SAML SSO token');
    expect(mapGitCloneFailure('org', 'repo', 'main', err)).toMatch(/SSO/i);
  });
});
