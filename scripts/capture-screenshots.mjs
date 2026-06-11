#!/usr/bin/env node
/**
 * Captura screenshots das telas para documentação.
 * Requer: frontend rodando em http://localhost:3001
 * Uso: npm run docs:screenshots
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3001';
const API_URL = process.env.SCREENSHOT_API_URL ?? 'http://localhost:3000';
const OUT_DIR = resolve(import.meta.dirname, '..', 'docs', 'screenshots');
const AUDIT_ID = 'screenshot-demo-001';
const VIEWPORT = { width: 1440, height: 900 };

const mockUser = {
  id: 'user-demo',
  email: 'auditor@empresa.com',
  name: 'Auditor Demo',
  role: 'auditor',
  githubConnected: true,
  githubUsername: 'demo-user',
};

const mockFinding = {
  id: 'finding-secrets-001',
  type: 'exposed_secret',
  severity: 'critical',
  message: 'Possível AWS Access Key exposta em workflow CI/CD',
  evidence: '.github/workflows/deploy.yml',
  category: 'Secrets Exposure',
  remediationAvailable: true,
};

const mockFinding2 = {
  id: 'finding-deps-001',
  type: 'malicious_dependency',
  severity: 'high',
  message: 'Dependência com indicadores de supply chain attack',
  evidence: 'package-lock.json → suspicious-pkg@1.2.3',
  category: 'Supply Chain',
  remediationAvailable: true,
};

const mockReport = {
  auditedAt: '2026-06-10T14:30:00.000Z',
  githubUsername: 'demo-user',
  totalRepositories: 24,
  publicRepositories: 18,
  privateRepositories: 6,
  totalVulnerabilities: 7,
  verdict: 'affected',
  allRepositories: [
    {
      fullName: 'demo-user/api-gateway',
      isPrivate: false,
      language: 'TypeScript',
      findings: [mockFinding],
      vulnerabilityCount: 1,
    },
    {
      fullName: 'demo-user/legacy-app',
      isPrivate: true,
      language: 'JavaScript',
      findings: [mockFinding2],
      vulnerabilityCount: 1,
    },
  ],
  affectedRepositories: [],
  technologies: [
    { name: 'TypeScript', repositoryCount: 12, affectedCount: 2 },
    { name: 'JavaScript', repositoryCount: 8, affectedCount: 1 },
  ],
  threatIntel: {
    lastSyncedAt: '2026-06-10T12:00:00.000Z',
    totalPackages: 1842,
    openSourceMalwareEnabled: true,
  },
};

const mockMarkdown = `# Relatório de Auditoria — @demo-user

**Data:** 10/06/2026  
**Veredito:** affected  
**Repositórios:** 24 (18 públicos · 6 privados)  
**Vulnerabilidades:** 7

## Resumo executivo

Foram identificados achados críticos de exposição de secrets e riscos de supply chain em 3 repositórios.
`;

const mockReportsList = [
  {
    id: AUDIT_ID,
    createdAt: '2026-06-10T14:30:00.000Z',
    report: {
      verdict: 'affected',
      githubUsername: 'demo-user',
      totalVulnerabilities: 7,
    },
  },
  {
    id: 'screenshot-demo-002',
    createdAt: '2026-06-03T09:15:00.000Z',
    report: {
      verdict: 'not_affected',
      githubUsername: 'demo-user',
      totalVulnerabilities: 0,
    },
  },
];

const mockFindings = [
  { ...mockFinding, repository: 'demo-user/api-gateway', auditId: AUDIT_ID },
  { ...mockFinding2, repository: 'demo-user/legacy-app', auditId: AUDIT_ID },
  {
    id: 'finding-cicd-001',
    type: 'unsafe_workflow',
    severity: 'medium',
    message: 'Workflow permite execução de código não confiável em pull_request',
    category: 'CI/CD',
    remediationAvailable: false,
    repository: 'demo-user/ci-templates',
    auditId: AUDIT_ID,
  },
];

const mockThreatIntel = {
  lastSyncedAt: '2026-06-10T12:00:00.000Z',
  totalPackages: 1842,
  githubAdvisories: 156,
  openSourceMalwareEnabled: true,
  sources: ['GitHub Advisory Database', 'OpenSourceMalware'],
};

function fulfillJson(route, data) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
}

function fulfillText(route, body, contentType = 'text/markdown; charset=utf-8') {
  return route.fulfill({ status: 200, contentType, body });
}

function handleApiRoute(route) {
  const url = new URL(route.request().url());
  const path = url.pathname;

  if (path === '/auth/github/config') return fulfillJson(route, { enabled: true });
  if (path === '/auth/github/status') {
    return fulfillJson(route, {
      enabled: true,
      connected: true,
      githubUsername: 'demo-user',
      connectedAt: '2026-06-10T10:00:00.000Z',
    });
  }
  if (path === '/audit/reports' && route.request().method() === 'GET') {
    return fulfillJson(route, mockReportsList);
  }
  if (path === `/audit/reports/${AUDIT_ID}`) {
    return fulfillJson(route, { id: AUDIT_ID, createdAt: mockReportsList[0].createdAt, report: mockReport });
  }
  if (path === `/audit/reports/${AUDIT_ID}/markdown`) {
    return fulfillText(route, mockMarkdown);
  }
  if (path === `/audit/reports/${AUDIT_ID}/findings`) {
    return fulfillJson(route, mockFindings);
  }
  if (path === '/threat-intel/status') {
    return fulfillJson(route, mockThreatIntel);
  }

  return fulfillJson(route, {});
}

async function setupApiMocks(context) {
  const apiHost = new URL(API_URL).host;
  await context.route(
    (url) => url.hostname === new URL(API_URL).hostname && url.port === new URL(API_URL).port,
    handleApiRoute,
  );
  // Fallback para variações de URL (127.0.0.1 vs localhost)
  await context.route(/\/auth\/|\/audit\/|\/threat-intel\//, (route) => {
    if (route.request().url().includes(apiHost) || route.request().url().includes('3000')) {
      return handleApiRoute(route);
    }
    return route.continue();
  });
}

function buildStorageState() {
  return {
    origins: [
      {
        origin: BASE_URL.replace(/\/$/, ''),
        localStorage: [
          {
            name: 'app-audit-auth',
            value: JSON.stringify({
              state: { token: 'screenshot-demo-token', user: mockUser },
              version: 0,
            }),
          },
        ],
      },
    ],
  };
}

async function capture(page, name, path, { waitFor } = {}) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
  if (waitFor) {
    await page.getByRole('heading', { name: waitFor }).waitFor({ timeout: 15_000 });
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(OUT_DIR, `${name}.png`) });
  console.log(`  ✓ ${name}.png`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  console.log(`Capturando telas de ${BASE_URL} → docs/screenshots/\n`);

  // —— Login (sem autenticação) ——
  const loginContext = await browser.newContext({ viewport: VIEWPORT, colorScheme: 'dark' });
  await setupApiMocks(loginContext);
  const loginPage = await loginContext.newPage();
  await loginPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await loginPage.getByRole('heading', { name: 'App Audit' }).waitFor({ timeout: 10_000 });
  await loginPage.waitForTimeout(800);
  await loginPage.screenshot({ path: resolve(OUT_DIR, '01-login.png') });
  console.log('  ✓ 01-login.png');
  await loginContext.close();

  // —— Telas autenticadas ——
  const authContext = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: 'dark',
    storageState: buildStorageState(),
  });
  await setupApiMocks(authContext);
  const page = await authContext.newPage();

  await capture(page, '02-dashboard', '/dashboard', { waitFor: 'Dashboard' });
  await capture(page, '03-auditorias', '/dashboard/audits', { waitFor: 'Auditorias' });
  await capture(page, '04-detalhe-auditoria', `/dashboard/audits/${AUDIT_ID}`, { waitFor: 'Auditoria' });
  await capture(page, '05-vulnerabilidades', '/dashboard/vulnerabilities', { waitFor: 'Vulnerabilidades' });
  await capture(page, '06-threat-intel', '/dashboard/threat-intel', { waitFor: 'Threat Intelligence' });

  await authContext.close();
  await browser.close();
  console.log('\nConcluído.');
}

main().catch((err) => {
  console.error('Falha ao capturar screenshots:', err.message);
  console.error('Certifique-se de que o frontend está rodando: npm run dev -w frontend');
  process.exit(1);
});
