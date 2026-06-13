const LOGIN_CONSENT_KEY = 'app-audit:login-consent';
const GITHUB_CONSENT_KEY = 'app-audit:github-consent';

interface StoredConsent {
  policyVersion: string;
  email?: string;
}

function readStored(key: string): StoredConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as StoredConsent;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: StoredConsent): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function rememberLoginConsent(policyVersion: string, email: string): void {
  writeStored(LOGIN_CONSENT_KEY, { policyVersion, email: email.toLowerCase() });
}

export function hasRememberedLoginConsent(
  policyVersion: string,
  email: string,
): boolean {
  const stored = readStored(LOGIN_CONSENT_KEY);
  return (
    stored?.policyVersion === policyVersion &&
    stored.email === email.toLowerCase()
  );
}

export function rememberGitHubConsent(policyVersion: string): void {
  writeStored(GITHUB_CONSENT_KEY, { policyVersion });
}

export function hasRememberedGitHubConsent(policyVersion: string): boolean {
  const stored = readStored(GITHUB_CONSENT_KEY);
  return stored?.policyVersion === policyVersion;
}

export function clearGitHubConsent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GITHUB_CONSENT_KEY);
}
