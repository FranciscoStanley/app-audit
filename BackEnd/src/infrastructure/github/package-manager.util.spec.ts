import {
  detectPackageManager,
  readPackageManagerField,
} from './package-manager.util';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('package-manager.util', () => {
  let repoPath: string;

  beforeEach(async () => {
    repoPath = join(tmpdir(), `app-audit-pm-${Date.now()}`);
    await mkdir(repoPath, { recursive: true });
  });

  afterEach(async () => {
    await rm(repoPath, { recursive: true, force: true });
  });

  it('detecta pnpm pelo lockfile', async () => {
    await writeFile(
      join(repoPath, 'pnpm-lock.yaml'),
      'lockfileVersion: 9\n',
      'utf-8',
    );
    await expect(detectPackageManager(repoPath)).resolves.toBe('pnpm');
  });

  it('detecta npm pelo package-lock.json', async () => {
    await writeFile(join(repoPath, 'package-lock.json'), '{}', 'utf-8');
    await expect(detectPackageManager(repoPath)).resolves.toBe('npm');
  });

  it('lê packageManager do package.json', async () => {
    await writeFile(
      join(repoPath, 'package.json'),
      JSON.stringify({ packageManager: 'pnpm@9.0.0' }),
      'utf-8',
    );
    await expect(readPackageManagerField(repoPath)).resolves.toBe('pnpm');
  });
});
