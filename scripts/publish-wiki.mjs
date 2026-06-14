#!/usr/bin/env node
/**
 * Publica a pasta wiki/ no repositório GitHub Wiki.
 * Uso: node scripts/publish-wiki.mjs
 * Requer: gh auth login (conta com push no repo)
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const wikiSrc = join(root, 'wiki');
const owner = 'FranciscoStanley';
const repo = 'app-audit';
const wikiRemote = `https://github.com/${owner}/${repo}.wiki.git`;

if (!existsSync(wikiSrc)) {
  console.error('Pasta wiki/ não encontrada.');
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'app-audit-wiki-'));
const branch = 'master';

try {
  let cloned = false;
  try {
    execSync(`git clone "${wikiRemote}" "${tmp}"`, { stdio: 'pipe' });
    cloned = true;
  } catch {
    execSync(`git init "${tmp}"`, { stdio: 'inherit' });
    execSync(`git -C "${tmp}" remote add origin "${wikiRemote}"`, { stdio: 'inherit' });
  }

  for (const name of readdirSync(wikiSrc)) {
    cpSync(join(wikiSrc, name), join(tmp, name), { force: true });
  }

  execSync(`git -C "${tmp}" add -A`, { stdio: 'inherit' });
  const status = execSync(`git -C "${tmp}" status --porcelain`, { encoding: 'utf8' });
  if (!status.trim()) {
    console.log('Wiki já está atualizada — nada a publicar.');
    process.exit(0);
  }

  execSync(`git -C "${tmp}" commit -m "docs(wiki): sync from app-audit/wiki"`, { stdio: 'inherit' });
  execSync(`git -C "${tmp}" push -u origin ${branch}`, { stdio: 'inherit' });
  console.log(`\nWiki publicada: https://github.com/${owner}/${repo}/wiki`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
