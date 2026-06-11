#!/usr/bin/env node
/**
 * Captura screenshots das telas para documentação.
 * Requer: frontend rodando em http://localhost:3001
 * Uso: npm run docs:screenshots
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Padrão: Docker Compose (frontend :3001, API :3000)
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
  message: 'Arquivo sensível exposto no repositório: .npmrc',
  evidence: '.npmrc',
  category: 'Secrets Exposure',
  remediationAvailable: true,
};

const mockFindingDependabot = {
  id: 'finding-deps-001',
  type: 'vulnerable_dependency',
  severity: 'critical',
  message: '[Dependabot] When Vitest UI server is listening, arbitrary file can be read',
  evidence: 'frontend/package.json|vitest|3.2.4|dependabot-42',
  category: 'Dependency Vulnerabilities',
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
      findings: [mockFindingDependabot],
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
    report: mockReport,
  },
  {
    id: 'screenshot-demo-002',
    createdAt: '2026-06-03T09:15:00.000Z',
    report: { ...mockReport, verdict: 'not_affected', totalVulnerabilities: 0 },
  },
];

const mockFindings = [
  { ...mockFinding, repository: 'demo-user/api-gateway', auditId: AUDIT_ID },
  { ...mockFindingDependabot, repository: 'demo-user/legacy-app', auditId: AUDIT_ID },
  {
    id: 'finding-cicd-001',
    type: 'unpinned_action',
    severity: 'medium',
    message: 'GitHub Action referenciada por tag mutável (@v*)',
    category: 'CI/CD Security',
    remediationAvailable: true,
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
  if (path === '/auth/github/consent') {
    return fulfillJson(route, {
      policyVersion: '1.0.0',
      controllerName: 'App Audit',
      contactEmail: 'privacidade@exemplo.com',
      legalBasis:
        'Art. 7º, I e V da LGPD — consentimento do titular e execução de contrato/prestação de serviço.',
      purposes: [
        'Autenticação via GitHub OAuth',
        'Auditoria de segurança dos repositórios autorizados',
        'Geração de relatórios e histórico de varreduras',
      ],
      scopes: [
        {
          scope: 'read:user',
          title: 'Perfil do usuário',
          description: 'Nome, e-mail público e identificador da conta GitHub.',
        },
        {
          scope: 'user:email',
          title: 'E-mails da conta',
          description: 'Endereços de e-mail associados à conta GitHub.',
        },
        {
          scope: 'repo',
          title: 'Repositórios',
          description: 'Leitura de repositórios públicos e privados para auditoria de segurança.',
        },
      ],
      dataSubjectRights: [
        'Confirmação e acesso aos dados tratados',
        'Correção de dados incompletos ou desatualizados',
        'Anonimização, bloqueio ou eliminação',
        'Portabilidade dos dados',
        'Revogação do consentimento e desconexão do GitHub',
      ],
      retentionSummary:
        'Tokens OAuth cifrados e logs de consentimento enquanto a conta estiver ativa; revogáveis a qualquer momento.',
      thirdParties: [{ name: 'GitHub, Inc.', purpose: 'Autenticação OAuth e API de repositórios' }],
    });
  }
  if (path === '/auth/github/status') {
    return fulfillJson(route, {
      enabled: true,
      connected: true,
      githubUsername: 'demo-user',
      connectedAt: '2026-06-10T10:00:00.000Z',
    });
  }
  if (path === `/audit/remediation/${mockFinding.id}/preview`) {
    return fulfillJson(route, {
      findingId: mockFinding.id,
      repository: 'demo-user/api-gateway',
      canAutoApply: true,
      steps: [
        { order: 1, title: 'Remover arquivo sensível', description: 'Remover .npmrc', automated: true },
        { order: 2, title: 'Adicionar ao .gitignore', description: 'Proteger .npmrc', automated: true },
        { order: 3, title: 'Abrir issue de rotação de credenciais', description: 'Rastrear rotação', automated: true },
      ],
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

const authStorageValue = JSON.stringify({
  state: { token: 'screenshot-demo-token', user: mockUser },
  version: 0,
});

async function seedAuth(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => {
    localStorage.setItem('app-audit-auth', value);
  }, authStorageValue);
}

async function capture(page, name, path, { waitFor, waitForExact } = {}) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
  if (waitFor) {
    await page
      .getByRole('heading', { name: waitFor, exact: waitForExact ?? false })
      .first()
      .waitFor({ timeout: 15_000 });
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

  await loginPage.getByRole('button', { name: /Entrar com GitHub/i }).click();
  await loginPage
    .getByRole('heading', { name: 'Consentimento — Login com GitHub' })
    .waitFor({ timeout: 10_000 });
  await loginPage.waitForTimeout(600);
  await loginPage.screenshot({ path: resolve(OUT_DIR, '01b-consentimento-lgpd.png') });
  console.log('  ✓ 01b-consentimento-lgpd.png');

  await loginContext.close();

  // —— Telas autenticadas ——
  const authContext = await browser.newContext({ viewport: VIEWPORT, colorScheme: 'dark' });
  await setupApiMocks(authContext);
  const page = await authContext.newPage();
  await seedAuth(page);

  await capture(page, '02-dashboard', '/dashboard', { waitFor: 'Dashboard' });
  await capture(page, '03-auditorias', '/dashboard/audits', { waitFor: 'Auditorias' });
  await capture(page, '04-detalhe-auditoria', `/dashboard/audits/${AUDIT_ID}`, {
    waitFor: 'Auditoria',
    waitForExact: true,
  });
  await capture(page, '05-vulnerabilidades', '/dashboard/vulnerabilities', { waitFor: 'Vulnerabilidades' });

  // Remediação: expandir plano no primeiro card com botão Resolver
  await page.goto(`${BASE_URL}/dashboard/vulnerabilities`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Resolver/i }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Aplicar correção/i }).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(OUT_DIR, '07-remediacao.png') });
  console.log('  ✓ 07-remediacao.png');

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
