import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type PackageManager = 'pnpm' | 'yarn' | 'npm' | 'pip';

export async function detectPackageManager(
  repoPath: string,
): Promise<PackageManager | null> {
  const checks: Array<[PackageManager, string]> = [
    ['pnpm', 'pnpm-lock.yaml'],
    ['yarn', 'yarn.lock'],
    ['npm', 'package-lock.json'],
    ['npm', 'package.json'],
    ['pip', 'requirements.txt'],
    ['pip', 'pyproject.toml'],
  ];

  for (const [manager, file] of checks) {
    try {
      await access(join(repoPath, file));
      return manager;
    } catch {
      // continue
    }
  }
  return null;
}

export async function readPackageManagerField(
  repoPath: string,
): Promise<PackageManager | null> {
  try {
    const raw = await readFile(join(repoPath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as { packageManager?: string };
    const pm = pkg.packageManager?.split('@')[0];
    if (pm === 'pnpm' || pm === 'yarn' || pm === 'npm') return pm;
  } catch {
    // ignore
  }
  return null;
}

export function lockfileNames(): string[] {
  return [
    'pnpm-lock.yaml',
    'yarn.lock',
    'package-lock.json',
    'requirements.txt',
    'poetry.lock',
  ];
}
