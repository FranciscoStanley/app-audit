#!/usr/bin/env node
/**
 * Sync wiki/ → GitHub Wiki (usado pelo workflow CI e localmente).
 * Uso: node scripts/sync-wiki-ci.mjs
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const wikiSrc = join(root, 'wiki');

const repo = process.env.GITHUB_REPOSITORY ?? 'FranciscoStanley/app-audit';
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const sha = process.env.GITHUB_SHA ?? 'local';

if (!existsSync(wikiSrc)) {
  console.error('Pasta wiki/ não encontrada.');
  process.exit(1);
}

const wikiRemote = token
  ? `https://x-access-token:${token}@github.com/${repo}.wiki.git`
  : `https://github.com/${repo}.wiki.git`;

const tmp = mkdtempSync(join(tmpdir(), 'app-audit-wiki-ci-'));

try {
  let hasRepo = false;
  try {
    execSync(`git clone "${wikiRemote}" "${tmp}"`, { stdio: 'pipe' });
    hasRepo = true;
  } catch {
    execSync(`git init "${tmp}"`, { stdio: 'inherit' });
    execSync(`git -C "${tmp}" remote add origin "${wikiRemote}"`, { stdio: 'inherit' });
  }

  for (const name of readdirSync(wikiSrc)) {
    if (name === 'README.md') continue;
    cpSync(join(wikiSrc, name), join(tmp, name), { force: true });
  }

  for (const name of readdirSync(tmp)) {
    if (/^wiki-Home\.md/i.test(name)) {
      rmSync(join(tmp, name), { force: true });
    }
  }

  execSync(`git -C "${tmp}" config user.name "github-actions[bot]"`, { stdio: 'pipe' });
  execSync(`git -C "${tmp}" config user.email "41898282+github-actions[bot]@users.noreply.github.com"`, {
    stdio: 'pipe',
  });
  execSync(`git -C "${tmp}" add -A`, { stdio: 'inherit' });

  const status = execSync(`git -C "${tmp}" status --porcelain`, { encoding: 'utf8' });
  if (!status.trim()) {
    console.log('Wiki already up to date');
    process.exit(0);
  }

  execSync(`git -C "${tmp}" commit -m "docs(wiki): sync from ${sha}"`, { stdio: 'inherit' });
  execSync(`git -C "${tmp}" branch -M master`, { stdio: 'pipe' });
  execSync(`git -C "${tmp}" push -u origin master`, { stdio: 'inherit' });
  console.log(`Wiki synced: https://github.com/${repo.split('/')[0]}/${repo.split('/')[1]}/wiki`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
