export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    let message = body || res.statusText;
    try {
      const json = JSON.parse(body) as { message?: string | string[] };
      if (json.message) {
        message = Array.isArray(json.message) ? json.message.join(', ') : json.message;
      }
    } catch {
      // keep raw body
    }
    throw new ApiError(message, res.status);
  }
  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as T;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  githubConnected?: boolean;
  githubUsername?: string;
}

export interface GitHubStatus {
  enabled: boolean;
  connected: boolean;
  githubUsername: string | null;
  connectedAt: string | null;
}

export interface GitHubConsentInfo {
  policyVersion: string;
  controllerName: string;
  contactEmail: string;
  scopes: Array<{ scope: string; title: string; description: string }>;
  purposes: string[];
  dataSubjectRights: string[];
  retentionSummary: string;
  thirdParties: Array<{ name: string; purpose: string }>;
  legalBasis: string;
}

export const api = {
  githubConsentInfo: () => request<GitHubConsentInfo>('/auth/github/consent'),

  acceptGitHubConsent: (body: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    dataProcessingAccepted: boolean;
    scopesAcknowledged: boolean;
  }) =>
    request<{ consentId: string; policyVersion: string; authorizeUrl: string }>(
      '/auth/github/consent/accept',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  disconnectGitHub: (token: string) =>
    request<{ disconnected: boolean; message: string }>('/auth/github/disconnect', { method: 'DELETE' }, token),

  githubOAuthEnabled: async () => {
    try {
      const res = await fetch(`${API_URL}/auth/github/config`);
      if (!res.ok) return false;
      const data = (await res.json()) as { enabled: boolean };
      return data.enabled;
    } catch {
      return false;
    }
  },

  login: (email: string, password: string) =>
    request<{ accessToken: string; user: AuthUser }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),

  me: (token: string) => request<AuthUser>('/auth/me', {}, token),

  githubStatus: (token: string) => request<GitHubStatus>('/auth/github/status', {}, token),

  exchangeGitHubCode: (code: string) =>
    request<{ accessToken: string; user: AuthUser }>('/auth/github/exchange', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  runAudit: (token: string) =>
    request<{ report: unknown; auditId?: string }>('/audit/run?save=true', { method: 'POST' }, token),

  listReports: (token: string) => request<Array<{ id: string; createdAt: string; report: unknown }>>('/audit/reports', {}, token),

  getReport: (token: string, id: string) =>
    request<{ id: string; createdAt: string; report: AuditReport }>(`/audit/reports/${id}`, {}, token),

  getMarkdown: async (token: string, id: string) => {
    const res = await fetch(`${API_URL}/audit/reports/${id}/markdown`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new ApiError('Falha ao baixar markdown', res.status);
    return res.text();
  },

  downloadPdf: (token: string, id: string) =>
    `${API_URL}/audit/reports/${id}/pdf`,

  listFindings: (token: string, auditId: string) =>
    request<Array<ThreatFinding & { repository: string; auditId: string }>>(
      `/audit/reports/${auditId}/findings`,
      {},
      token,
    ),

  getFindingMarkdown: async (token: string, auditId: string, findingId: string) => {
    const res = await fetch(`${API_URL}/audit/reports/${auditId}/findings/${findingId}/markdown`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new ApiError('Falha ao baixar relatório da vulnerabilidade', res.status);
    return res.text();
  },

  downloadFindingPdf: (token: string, auditId: string, findingId: string) =>
    `${API_URL}/audit/reports/${auditId}/findings/${findingId}/pdf`,

  threatIntelStatus: (token: string) => request<unknown>('/threat-intel/status', {}, token),

  syncThreatIntel: (token: string) =>
    request<unknown>('/threat-intel/sync', { method: 'POST' }, token),

  previewRemediation: (token: string, findingId: string) =>
    request<RemediationPlan>(`/audit/remediation/${findingId}/preview`, {}, token),

  applyRemediation: (token: string, findingId: string) =>
    request<RemediationResult>(`/audit/remediation/${findingId}/apply`, { method: 'POST' }, token),

  createUser: (
    token: string,
    body: { email: string; password: string; name: string; role: string },
  ) => request<{ id: string; email: string; name: string; role: string }>('/auth/users', { method: 'POST', body: JSON.stringify(body) }, token),
};

export interface ThreatFinding {
  id: string;
  type: string;
  severity: string;
  message: string;
  evidence?: string;
  category: string;
  remediationAvailable: boolean;
}

export interface RepositoryScan {
  fullName: string;
  isPrivate: boolean;
  language: string | null;
  findings: ThreatFinding[];
  vulnerabilityCount: number;
}

export interface AuditReport {
  auditedAt: string;
  githubUsername: string;
  totalRepositories: number;
  publicRepositories: number;
  privateRepositories: number;
  totalVulnerabilities: number;
  verdict: string;
  allRepositories: RepositoryScan[];
  affectedRepositories: RepositoryScan[];
  technologies: Array<{ name: string; repositoryCount: number; affectedCount: number }>;
  threatIntel: {
    lastSyncedAt: string | null;
    totalPackages: number;
    openSourceMalwareEnabled: boolean;
  };
}

export interface RemediationPlan {
  findingId: string;
  repository: string;
  steps: Array<{ order: number; title: string; description: string; automated: boolean }>;
  canAutoApply: boolean;
}

export interface RemediationResult {
  success: boolean;
  message: string;
  appliedSteps: string[];
  requiresManualSteps: string[];
}
