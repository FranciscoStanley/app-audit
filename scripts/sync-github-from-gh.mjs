#!/usr/bin/env node
/**
 * Sincroniza GITHUB_TOKEN dos .env locais com `gh auth token` (conta gh CLI).
 * Não altera OAuth client id/secret.
 *
 * Uso: node scripts/sync-github-from-gh.mjs
 */
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '..');
const TARGETS = [
  resolve(ROOT, 'BackEnd', '.env'),
  resolve(ROOT, '.env'),
];

const REQUIRED_SCOPES = ['repo', 'security_events'];

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

async function ghAuthStatus() {
  const { stdout } = await execFileAsync('gh', ['auth', 'status'], {
    windowsHide: true,
  });
  const scopeLine = stdout
    .split('\n')
    .find((l) => l.includes('Token scopes'));
  const scopes = [...scopeLine.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const account =
    stdout.match(/account (\S+)/)?.[1] ?? 'desconhecida';
  return { scopes, account };
}

async function main() {
  let token;
  try {
    const { stdout } = await execFileAsync('gh', ['auth', 'token'], {
      windowsHide: true,
    });
    token = stdout.trim();
  } catch {
    console.error('gh não autenticado. Execute: gh auth login');
    process.exit(1);
  }

  const { scopes, account } = await ghAuthStatus();
  const missing = REQUIRED_SCOPES.filter((s) => !scopes.includes(s));
  if (missing.length > 0) {
    console.warn(
      `⚠ Escopos faltando no gh (${account}): ${missing.join(', ')}`,
    );
    console.warn(
      '  Execute: gh auth refresh -h github.com -s repo,read:org,read:user,user:email,security_events,gist',
    );
  } else {
    console.log(`✓ gh autenticado como ${account} com escopos necessários`);
  }

  for (const file of TARGETS) {
    try {
      let content = await readFile(file, 'utf-8');
      content = upsertEnv(content, 'GITHUB_TOKEN', token);
      await writeFile(file, content, 'utf-8');
      console.log(`✓ GITHUB_TOKEN atualizado em ${file}`);
    } catch {
      console.warn(`⚠ Ignorado (arquivo ausente): ${file}`);
    }
  }

  console.log('\nReinicie o backend/Docker: docker compose up -d --force-recreate backend');
  console.log('No app-audit: Auditorias → Desconectar GitHub → Conectar de novo (escopos OAuth).');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
