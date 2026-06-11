#!/usr/bin/env node
/**
 * Configura GITHUB_OAUTH_* nos .env locais (não versionados).
 *
 * Uso:
 *   GITHUB_OAUTH_CLIENT_ID=Ov23... GITHUB_OAUTH_CLIENT_SECRET=... node scripts/setup-github-oauth.mjs
 *
 * Ou interativo (PowerShell):
 *   $env:GITHUB_OAUTH_CLIENT_ID="..."; $env:GITHUB_OAUTH_CLIENT_SECRET="..."; node scripts/setup-github-oauth.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TARGETS = [
  resolve(ROOT, 'BackEnd', '.env'),
  resolve(ROOT, '.env'),
];

const OAUTH_LINES = {
  GITHUB_OAUTH_CLIENT_ID: process.env.GITHUB_OAUTH_CLIENT_ID?.trim() ?? '',
  GITHUB_OAUTH_CLIENT_SECRET: process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim() ?? '',
  GITHUB_OAUTH_CALLBACK_URL:
    process.env.GITHUB_OAUTH_CALLBACK_URL?.trim() ??
    'http://localhost:3000/auth/github/callback',
  FRONTEND_URL: process.env.FRONTEND_URL?.trim() ?? 'http://localhost:3001',
};

const KEYS = Object.keys(OAUTH_LINES);

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

async function main() {
  if (!OAUTH_LINES.GITHUB_OAUTH_CLIENT_ID || !OAUTH_LINES.GITHUB_OAUTH_CLIENT_SECRET) {
    console.error('Defina GITHUB_OAUTH_CLIENT_ID e GITHUB_OAUTH_CLIENT_SECRET no ambiente.');
    console.error('');
    console.error('Obtenha em: https://github.com/settings/applications/3659122');
    console.error('  → Client ID (visível na página)');
    console.error('  → Generate a new client secret');
    process.exit(1);
  }

  for (const file of TARGETS) {
    try {
      let content = await readFile(file, 'utf-8');
      for (const key of KEYS) {
        content = upsertEnv(content, key, OAUTH_LINES[key]);
      }
      if (!content.includes('# GitHub OAuth')) {
        content = content.replace(
          /(GITHUB_TOKEN=.*\n)/,
          `$1\n# GitHub OAuth — app-audit (https://github.com/settings/applications/3659122)\n`,
        );
      }
      await writeFile(file, content, 'utf-8');
      console.log(`✓ Atualizado: ${file}`);
    } catch (err) {
      console.warn(`⚠ Ignorado (arquivo ausente): ${file}`);
    }
  }

  console.log('\nReinicie o BackEnd para aplicar. Botão "Entrar com GitHub" aparecerá no login.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
