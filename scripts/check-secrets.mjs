#!/usr/bin/env node
/**
 * Varredura local de secrets antes do push.
 * Uso: npm run security:scan
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

const SECRET_PATTERNS = [
  { name: 'GitHub PAT (ghp_)', re: /ghp_[a-zA-Z0-9]{20,}/ },
  { name: 'GitHub OAuth (gho_)', re: /gho_[a-zA-Z0-9]{20,}/ },
  { name: 'GitHub fine-grained', re: /github_pat_[a-zA-Z0-9_]{20,}/ },
  { name: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'OpenAI key', re: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'JWT atribuído', re: /JWT_SECRET\s*=\s*[^\s#][^\n]{20,}/ },
  { name: 'GitHub token atribuído', re: /GITHUB_TOKEN\s*=\s*gh[pousr_]/ },
  { name: 'OAuth secret atribuído', re: /GITHUB_OAUTH_CLIENT_SECRET\s*=\s*[^\s#][^\n]{8,}/ },
  { name: 'Admin password atribuído', re: /ADMIN_PASSWORD\s*=\s*[^\s#][^\n]{8,}/ },
];

const ALLOWLIST_PATHS = [
  /\.env\.example$/,
  /\.env\.docker\.example$/,
  /\.env\.production\.example$/,
  /token-cipher\.spec\.ts$/,
  /additional-security\.scanner\.ts$/,
  /setup-env\.ts$/,
  /check-secrets\.mjs$/,
  /\.gitleaks\.toml$/,
  /docs\/deployment\.md$/,
  /node_modules\//,
  /dist\//,
  /\.next\//,
];

const ALLOWLIST_VALUES = [
  'gho_abcdefghijklmnopqrstuvwxyz123456',
  'test-secret-key-for-cipher-32chars!!',
];

function isAllowlisted(filePath, line) {
  if (ALLOWLIST_PATHS.some((p) => p.test(filePath))) return true;
  if (ALLOWLIST_VALUES.some((v) => line.includes(v))) return true;
  if (/JWT_SECRET=\s*$/.test(line)) return true;
  if (/GITHUB_TOKEN=\s*$/.test(line)) return true;
  if (/ADMIN_PASSWORD=\s*$/.test(line)) return true;
  if (/GITHUB_OAUTH_CLIENT_SECRET=\s*$/.test(line)) return true;
  return false;
}

function getTrackedFiles() {
  try {
    const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf-8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function scanFile(relPath) {
  const abs = resolve(ROOT, relPath);
  if (!existsSync(abs)) return [];
  const content = readFileSync(abs, 'utf-8');
  const hits = [];

  for (const [i, line] of content.split('\n').entries()) {
    if (isAllowlisted(relPath, line)) continue;
    for (const { name, re } of SECRET_PATTERNS) {
      if (re.test(line)) {
        hits.push({ file: relPath, line: i + 1, rule: name, snippet: line.trim().slice(0, 80) });
      }
    }
  }
  return hits;
}

const files = getTrackedFiles();
const findings = files.flatMap(scanFile);

if (findings.length > 0) {
  console.error('\n❌ Possíveis secrets detectados:\n');
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line} [${f.rule}]`);
    console.error(`    ${f.snippet}\n`);
  }
  console.error('Corrija antes de fazer push para repositório público.\n');
  process.exit(1);
}

console.log('✓ Nenhum secret detectado nos arquivos versionados.');
