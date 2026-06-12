const TOKEN_PATTERNS: RegExp[] = [
  /gho_[A-Za-z0-9_]+/g,
  /ghp_[A-Za-z0-9_]+/g,
  /github_pat_[A-Za-z0-9_]+/g,
  /x-access-token:[^@\s]+@/gi,
  /Bearer\s+gh[oap]_[A-Za-z0-9_]+/gi,
];

export function sanitizeGitError(message: string): string {
  let out = message;
  for (const pattern of TOKEN_PATTERNS) {
    out = out.replace(pattern, (match) => {
      if (match.toLowerCase().startsWith('x-access-token:'))
        return 'x-access-token:***@';
      if (match.toLowerCase().startsWith('bearer')) return 'Bearer ***';
      return '***';
    });
  }
  return out.trim();
}

export function mapGitCloneFailure(
  owner: string,
  repo: string,
  defaultBranch: string,
  error: Error,
): string {
  const raw = sanitizeGitError(
    [error.message, (error as Error & { stderr?: string }).stderr ?? '']
      .filter(Boolean)
      .join(' '),
  );
  const lower = raw.toLowerCase();
  const fullName = `${owner}/${repo}`;

  if (/repository not found|not found/i.test(raw)) {
    return `Repositório ${fullName} não encontrado ou o token GitHub não tem permissão de leitura (escopo repo).`;
  }
  if (/authentication failed|invalid username or password|403|401/i.test(raw)) {
    return `Falha de autenticação ao clonar ${fullName}. Reconecte o GitHub ou verifique se o token ainda é válido.`;
  }
  if (/saml|sso|single sign-on/i.test(raw)) {
    return `Organização exige autorização SSO para o token GitHub. Acesse github.com/settings/tokens e autorize o token para a org ${owner}.`;
  }
  if (
    /remote branch .* not found|could not find remote branch/i.test(raw) ||
    (lower.includes('branch') && lower.includes('not found'))
  ) {
    return `Branch padrão "${defaultBranch}" não encontrada em ${fullName}. Verifique o branch padrão no GitHub.`;
  }
  if (/empty repository|does not have any commits/i.test(raw)) {
    return `Repositório ${fullName} está vazio (sem commits). Adicione um commit inicial antes da remediação via workspace.`;
  }
  if (/timeout|timed out/i.test(raw)) {
    return `Timeout ao clonar ${fullName}. O repositório pode ser grande — tente novamente ou aumente REMEDIATION_GIT_TIMEOUT_MS.`;
  }

  return `Falha ao clonar ${fullName}: ${raw.slice(0, 280)}`;
}
