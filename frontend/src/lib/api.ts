export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
export const API_V1 = '/v1';

function apiPath(path: string): string {
  if (path.startsWith('/v1')) return path;
  return `${API_V1}${path.startsWith('/') ? path : `/${path}`}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AuditReportSummary {
  id: string;
  createdAt: string;
  githubUsername: string;
  verdict: string;
  totalVulnerabilities: number;
  repositoryCount: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${apiPath(path)}`, { ...options, headers });
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
  controllerAddress?: string | null;
  scopes: Array<{ scope: string; title: string; description: string }>;
  purposes: string[];
  dataSubjectRights: string[];
  retentionSummary: string;
  thirdParties: Array<{ name: string; purpose: string }>;
  internationalTransfer?: string;
  legalBasis: string;
}

export interface RemediationConsentInfo {
  policyVersion: string;
  controllerName: string;
  contactEmail: string;
  actions: Array<{ action: string; title: string; description: string }>;
  risks: string[];
  legalBasis: string;
  accepted: boolean;
}

export const api = {
  legalInfo: () =>
    request<{
      policyVersion: string;
      termsUrl: string;
      privacyUrl: string;
      controllerName: string;
      contactEmail: string;
      dpoEmail: string | null;
    }>('/auth/legal/info'),

  loginConsentInfo: () =>
    request<{ policyVersion: string; legalBasis: string; purposes: string[] }>('/auth/login/consent'),

  remediationConsentStatus: (token: string) =>
    request<RemediationConsentInfo>('/audit/remediation/consent', {}, token),

  acceptRemediationConsent: (
    token: string,
    body: {
      termsAccepted: boolean;
      privacyAccepted: boolean;
      remediationAcknowledged: boolean;
      risksAcknowledged: boolean;
    },
  ) =>
    request<{ accepted: boolean; policyVersion: string }>(
      '/audit/remediation/consent/accept',
      { method: 'POST', body: JSON.stringify(body) },
      token,
    ),

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
      const res = await fetch(`${API_URL}${apiPath('/auth/github/config')}`);
      if (!res.ok) return false;
      const data = (await res.json()) as { enabled: boolean };
      return data.enabled;
    } catch {
      return false;
    }
  },

  login: (email: string, password: string, consent: { termsAccepted: boolean; privacyAccepted: boolean }) =>
    request<{ accessToken: string; user: AuthUser }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password, ...consent }) },
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

  enqueueAuditJob: (token: string) =>
    request<{ jobId: string; status: string }>('/audit/jobs/audit-run', { method: 'POST' }, token),

  enqueueRemediationJob: (token: string, findingId: string) =>
    request<{ jobId: string; status: string }>(
      '/audit/jobs/remediation',
      { method: 'POST', body: JSON.stringify({ findingId }) },
      token,
    ),

  enqueueRemediationAllJob: (token: string, auditId: string) =>
    request<{ jobId: string; status: string }>(
      '/audit/jobs/remediation-all',
      { method: 'POST', body: JSON.stringify({ auditId }) },
      token,
    ),

  getBackgroundJob: (token: string, jobId: string) =>
    request<BackgroundJobResponse>(`/audit/jobs/${jobId}`, {}, token),

  listBackgroundJobs: (
    token: string,
    params?: PaginationParams & { status?: BackgroundJobResponse['status'] },
  ) =>
    request<PaginatedResponse<BackgroundJobResponse>>(
      `/audit/jobs${buildQuery({
        page: params?.page,
        pageSize: params?.pageSize,
        status: params?.status,
      })}`,
      {},
      token,
    ),

  listReports: (token: string, params?: PaginationParams) =>
    request<PaginatedResponse<AuditReportSummary>>(
      `/audit/reports${buildQuery({ page: params?.page, pageSize: params?.pageSize })}`,
      {},
      token,
    ),

  getReport: (token: string, id: string) =>
    request<{ id: string; createdAt: string; report: AuditReport }>(`/audit/reports/${id}`, {}, token),

  getMarkdown: async (token: string, id: string) => {
    const res = await fetch(`${API_URL}${apiPath(`/audit/reports/${id}/markdown`)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new ApiError('Falha ao baixar markdown', res.status);
    return res.text();
  },

  downloadPdf: (token: string, id: string) =>
    `${API_URL}${apiPath(`/audit/reports/${id}/pdf`)}`,

  listFindings: (
    token: string,
    auditId: string,
    params?: PaginationParams & {
      category?: string;
      severity?: string;
      remediationAvailable?: boolean;
    },
  ) =>
    request<PaginatedResponse<ThreatFinding & { repository: string; auditId: string }>>(
      `/audit/reports/${auditId}/findings${buildQuery({
        page: params?.page,
        pageSize: params?.pageSize,
        category: params?.category !== 'all' ? params?.category : undefined,
        severity: params?.severity,
        remediationAvailable: params?.remediationAvailable,
      })}`,
      {},
      token,
    ),

  getFindingMarkdown: async (token: string, auditId: string, findingId: string) => {
    const res = await fetch(`${API_URL}${apiPath(`/audit/reports/${auditId}/findings/${findingId}/markdown`)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new ApiError('Falha ao baixar relatório da vulnerabilidade', res.status);
    return res.text();
  },

  downloadFindingPdf: (token: string, auditId: string, findingId: string) =>
    `${API_URL}${apiPath(`/audit/reports/${auditId}/findings/${findingId}/pdf`)}`,

  threatIntelStatus: (token: string) => request<unknown>('/threat-intel/status', {}, token),

  syncThreatIntel: (token: string) =>
    request<unknown>('/threat-intel/sync', { method: 'POST' }, token),

  previewRemediation: (token: string, findingId: string) =>
    request<RemediationPlan>(`/audit/remediation/${findingId}/preview`, {}, token),

  applyRemediation: (token: string, findingId: string) =>
    request<RemediationResult>(`/audit/remediation/${findingId}/apply`, { method: 'POST' }, token),

  applyAllRemediation: (token: string, auditId: string) =>
    request<{
      total: number;
      succeeded: number;
      failed: number;
      results: Array<{ findingId: string; message: string; success: boolean; pullRequestUrl?: string }>;
    }>(`/audit/reports/${auditId}/remediate-all`, { method: 'POST' }, token),

  listUsers: (token: string, params?: PaginationParams) =>
    request<PaginatedResponse<{ id: string; email: string; name: string; role: string }>>(
      `/auth/users${buildQuery({ page: params?.page, pageSize: params?.pageSize })}`,
      {},
      token,
    ),

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
  delivery?: {
    method: 'direct_push' | 'pull_request' | 'no_changes';
    branch: string;
    pullRequestUrl?: string;
    lockfilesUpdated: string[];
    commitSha?: string;
  };
  dependabot?: {
    targetedAlertNumbers: number[];
    closedAlertNumbers: number[];
    stillOpenAlertNumbers: number[];
  };
}

export interface BackgroundJobResponse {
  id: string;
  type: 'audit_run' | 'remediation_apply' | 'remediation_apply_all';
  status: 'pending' | 'running' | 'completed' | 'failed';
  label: string;
  findingId?: string;
  auditId?: string;
  progress?: {
    phase: string;
    current: number;
    total: number;
    message?: string;
  };
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}
