import { Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import {
  access,
  mkdir,
  readFile,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { promisify } from 'node:util';
import {
  detectPackageManager,
  lockfileNames,
  readPackageManagerField,
  type PackageManager,
} from './package-manager.util';

const execFileAsync = promisify(execFile);

export interface DeliveryResult {
  method: 'direct_push' | 'pull_request' | 'no_changes';
  branch: string;
  pullRequestUrl?: string;
  lockfilesUpdated: string[];
  commitSha?: string;
}

export class RemediationGitWorkspace {
  private readonly logger = new Logger(RemediationGitWorkspace.name);

  constructor(
    private readonly accessToken: string,
    private readonly workRoot: string,
  ) {}

  async clone(
    owner: string,
    repo: string,
  ): Promise<{ repoPath: string; defaultBranch: string }> {
    await mkdir(this.workRoot, { recursive: true });
    const repoPath = join(this.workRoot, `${owner}-${repo}-${Date.now()}`);

    const defaultBranch = await this.getDefaultBranch(owner, repo);

    await this.run('git', [
      'clone',
      '--depth',
      '1',
      '--branch',
      defaultBranch,
      `https://x-access-token:${this.accessToken}@github.com/${owner}/${repo}.git`,
      repoPath,
    ]);

    await this.run(
      'git',
      ['config', 'user.email', 'security@app-audit.local'],
      { cwd: repoPath },
    );
    await this.run('git', ['config', 'user.name', 'App Audit Security Bot'], {
      cwd: repoPath,
    });

    return { repoPath, defaultBranch };
  }

  async deleteFile(repoPath: string, relativePath: string): Promise<void> {
    try {
      await unlink(join(repoPath, relativePath));
    } catch {
      // already absent
    }
  }

  async ensureGitignoreEntry(repoPath: string, entry: string): Promise<void> {
    const gitignorePath = join(repoPath, '.gitignore');
    const normalized = entry.replace(/^\//, '').trim();
    let content = '';
    try {
      content = await readFile(gitignorePath, 'utf-8');
    } catch {
      content = '';
    }
    if (content.split('\n').some((line) => line.trim() === normalized)) return;
    const updated = [
      ...content.split('\n').filter(Boolean),
      normalized,
      '',
    ].join('\n');
    await writeFile(gitignorePath, updated, 'utf-8');
  }

  async pinWorkflowActions(
    repoPath: string,
    workflowPath: string,
  ): Promise<number> {
    const fullPath = join(repoPath, workflowPath);
    let content = await readFile(fullPath, 'utf-8');
    const actionRefRegex =
      /uses:\s*([^\s@/]+\/[^\s@]+)@(v[\d.]+|main|master)\b/gi;
    let pinned = 0;

    const matches = [...content.matchAll(actionRefRegex)];
    for (const match of matches) {
      const action = match[1];
      const ref = match[2];
      const sha = await this.resolveActionSha(action, ref);
      if (!sha) continue;

      const oldRef = `${action}@${ref}`;
      const newRef = `${action}@${sha}`;
      if (content.includes(newRef)) continue;
      content = content.replaceAll(oldRef, newRef);
      pinned++;
    }

    if (pinned > 0) await writeFile(fullPath, content, 'utf-8');
    return pinned;
  }

  async sanitizeFile(
    repoPath: string,
    relativePath: string,
    patterns: string[],
  ): Promise<void> {
    const fullPath = join(repoPath, relativePath);
    try {
      const content = await readFile(fullPath, 'utf-8');
      const filtered = content
        .split('\n')
        .filter((line) => !patterns.some((p) => line.includes(p)))
        .join('\n');
      if (filtered.trim() !== content.trim()) {
        await writeFile(fullPath, filtered, 'utf-8');
      } else {
        await this.deleteFile(repoPath, relativePath);
      }
    } catch {
      await this.deleteFile(repoPath, relativePath);
    }
  }

  async updatePackageVersion(
    repoPath: string,
    manifestPath: string,
    packageName: string,
    targetVersion: string,
  ): Promise<void> {
    const fullPath = join(repoPath, manifestPath);
    const pkg = JSON.parse(await readFile(fullPath, 'utf-8')) as Record<
      string,
      Record<string, string>
    >;
    const version =
      targetVersion.startsWith('^') || targetVersion.startsWith('~')
        ? targetVersion
        : `^${targetVersion.replace(/^[\^~]/, '')}`;

    let updated = false;
    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      if (pkg[field]?.[packageName]) {
        pkg[field][packageName] = version;
        updated = true;
      }
    }
    if (!updated) {
      pkg.dependencies = pkg.dependencies ?? {};
      pkg.dependencies[packageName] = version;
    }
    await writeFile(fullPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
  }

  async removePackage(
    repoPath: string,
    manifestPath: string,
    packageName: string,
  ): Promise<void> {
    const fullPath = join(repoPath, manifestPath);
    const pkg = JSON.parse(await readFile(fullPath, 'utf-8')) as Record<
      string,
      Record<string, string>
    >;
    let removed = false;
    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      if (pkg[field]?.[packageName]) {
        delete pkg[field][packageName];
        removed = true;
      }
    }
    if (!removed)
      throw new Error(
        `Pacote ${packageName} não encontrado em ${manifestPath}`,
      );
    await writeFile(fullPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
  }

  async regenerateLockfiles(
    repoPath: string,
    manifestPath?: string,
  ): Promise<string[]> {
    const fieldPm = await readPackageManagerField(repoPath);
    const detected = fieldPm ?? (await detectPackageManager(repoPath));
    if (!detected) return [];

    const cwd = manifestPath ? join(repoPath, dirname(manifestPath)) : repoPath;
    const installRoot =
      detected === 'pnpm' || detected === 'yarn' ? repoPath : cwd;

    try {
      switch (detected) {
        case 'pnpm':
          await this.run(
            'pnpm',
            ['install', '--lockfile-only', '--ignore-scripts'],
            {
              cwd: installRoot,
              timeout: 300_000,
            },
          );
          break;
        case 'yarn':
          await this.run('yarn', ['install', '--mode', 'update-lockfile'], {
            cwd: installRoot,
            timeout: 300_000,
          });
          break;
        case 'npm':
          await this.run(
            'npm',
            ['install', '--package-lock-only', '--ignore-scripts'],
            {
              cwd: installRoot,
              timeout: 300_000,
            },
          );
          break;
        case 'pip':
          await this.run(
            'pip',
            ['install', '--upgrade', '-r', 'requirements.txt'],
            {
              cwd: installRoot,
              timeout: 300_000,
            },
          ).catch(() =>
            this.run('pip', ['install', '-r', 'requirements.txt'], {
              cwd: installRoot,
              timeout: 300_000,
            }),
          );
          break;
      }
    } catch (error) {
      this.logger.warn(`Lockfile regen parcial: ${(error as Error).message}`);
    }

    const updated: string[] = [];
    for (const name of lockfileNames()) {
      try {
        await access(join(repoPath, name));
        updated.push(name);
      } catch {
        // not present
      }
    }
    return updated;
  }

  async deliver(
    repoPath: string,
    owner: string,
    repo: string,
    defaultBranch: string,
    commitMessage: string,
    prTitle: string,
    prBody: string,
  ): Promise<DeliveryResult> {
    const status = await this.run('git', ['status', '--porcelain'], {
      cwd: repoPath,
    });
    if (!status.stdout.trim()) {
      return {
        method: 'no_changes',
        branch: defaultBranch,
        lockfilesUpdated: [],
      };
    }

    await this.run('git', ['add', '-A'], { cwd: repoPath });
    await this.run('git', ['commit', '-m', commitMessage], { cwd: repoPath });

    const sha = (
      await this.run('git', ['rev-parse', 'HEAD'], { cwd: repoPath })
    ).stdout.trim();

    try {
      await this.run('git', ['push', 'origin', `HEAD:${defaultBranch}`], {
        cwd: repoPath,
        timeout: 120_000,
      });
      return {
        method: 'direct_push',
        branch: defaultBranch,
        commitSha: sha,
        lockfilesUpdated: [],
      };
    } catch (pushError) {
      this.logger.warn(
        `Push direto falhou, criando PR: ${(pushError as Error).message}`,
      );
    }

    const branch = `security/app-audit-${Date.now()}`;
    await this.run('git', ['checkout', '-b', branch], { cwd: repoPath });
    await this.run('git', ['push', '-u', 'origin', branch], {
      cwd: repoPath,
      timeout: 120_000,
    });

    const prUrl = await this.createPullRequest(
      owner,
      repo,
      branch,
      defaultBranch,
      prTitle,
      prBody,
    );
    return {
      method: 'pull_request',
      branch,
      pullRequestUrl: prUrl,
      commitSha: sha,
      lockfilesUpdated: [],
    };
  }

  async cleanup(repoPath: string): Promise<void> {
    try {
      await rm(repoPath, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  private async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const { stdout } = await this.runGh([
      'api',
      `repos/${owner}/${repo}`,
      '--jq',
      '.default_branch',
    ]);
    return stdout.trim() || 'main';
  }

  private async createPullRequest(
    owner: string,
    repo: string,
    head: string,
    base: string,
    title: string,
    body: string,
  ): Promise<string> {
    const { stdout } = await this.runGh([
      'pr',
      'create',
      '--repo',
      `${owner}/${repo}`,
      '--head',
      head,
      '--base',
      base,
      '--title',
      title,
      '--body',
      body,
    ]);
    return stdout.trim();
  }

  private async resolveActionSha(
    action: string,
    ref: string,
  ): Promise<string | null> {
    try {
      const { stdout } = await this.runGh([
        'api',
        `repos/${action}/git/ref/tags/${ref}`,
        '--jq',
        '.object.sha // .object.url',
      ]);
      const result = stdout.trim();
      if (/^[a-f0-9]{40}$/i.test(result)) return result;
      if (result.startsWith('https://')) {
        const { stdout: shaOut } = await this.runGh([
          'api',
          result,
          '--jq',
          '.object.sha',
        ]);
        const sha = shaOut.trim();
        return /^[a-f0-9]{40}$/i.test(sha) ? sha : null;
      }
      const { stdout: commitSha } = await this.runGh([
        'api',
        `repos/${action}/commits/${ref}`,
        '--jq',
        '.sha',
      ]);
      const sha = commitSha.trim();
      return /^[a-f0-9]{40}$/i.test(sha) ? sha : null;
    } catch {
      return null;
    }
  }

  private async runGh(
    args: string[],
  ): Promise<{ stdout: string; stderr: string }> {
    const env = { ...process.env, GITHUB_TOKEN: this.accessToken };
    return execFileAsync('gh', args, {
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true,
      env,
      timeout: 120_000,
    });
  }

  private async run(
    cmd: string,
    args: string[],
    opts: { cwd?: string; timeout?: number } = {},
  ): Promise<{ stdout: string; stderr: string }> {
    const env = { ...process.env, GITHUB_TOKEN: this.accessToken };
    return execFileAsync(cmd, args, {
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true,
      env,
      cwd: opts.cwd,
      timeout: opts.timeout ?? 120_000,
    });
  }
}
