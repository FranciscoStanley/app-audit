import { Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import {
  access,
  mkdir,
  readFile,
  readdir,
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
import {
  mapGitCloneFailure,
  sanitizeGitError,
} from './git-error.util';

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

    await this.assertRepoCloneAccess(owner, repo);
    const defaultBranch = await this.getDefaultBranch(owner, repo);

    const strategies: Array<() => Promise<void>> = [
      () => this.cloneViaGh(owner, repo, repoPath, defaultBranch),
      () => this.cloneViaGitAuth(owner, repo, repoPath, defaultBranch),
      () => this.cloneViaGitAuth(owner, repo, repoPath),
    ];

    let lastError: Error | undefined;
    for (const strategy of strategies) {
      await rm(repoPath, { recursive: true, force: true }).catch(() => undefined);
      try {
        await strategy();
        await this.configureGitIdentity(repoPath);
        await this.deepenClone(repoPath, defaultBranch);
        return { repoPath, defaultBranch };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Estratégia de clone falhou (${owner}/${repo}): ${sanitizeGitError(lastError.message)}`,
        );
      }
    }

    throw new Error(
      mapGitCloneFailure(owner, repo, defaultBranch, lastError ?? new Error('clone failed')),
    );
  }

  private async assertRepoCloneAccess(owner: string, repo: string): Promise<void> {
    try {
      await this.runGh([
        'api',
        `repos/${owner}/${repo}`,
        '--jq',
        '.full_name',
      ]);
    } catch {
      throw new Error(
        `Sem acesso ao repositório ${owner}/${repo}. Conecte o GitHub com escopo repo e, se for organização, autorize SSO em github.com/settings/tokens.`,
      );
    }
  }

  private async cloneViaGh(
    owner: string,
    repo: string,
    repoPath: string,
    branch: string,
  ): Promise<void> {
    await this.runGh([
      'repo',
      'clone',
      `${owner}/${repo}`,
      repoPath,
      '--',
      '--depth',
      '1',
      '--single-branch',
      '--branch',
      branch,
    ]);
  }

  private async cloneViaGitAuth(
    owner: string,
    repo: string,
    repoPath: string,
    branch?: string,
  ): Promise<void> {
    const args = [
      '-c',
      `http.extraHeader=Authorization: Bearer ${this.accessToken}`,
      'clone',
      '--depth',
      '1',
    ];
    if (branch) {
      args.push('--single-branch', '--branch', branch);
    }
    args.push(
      `https://github.com/${owner}/${repo}.git`,
      repoPath,
    );
    await this.run('git', args);
  }

  private async configureGitIdentity(repoPath: string): Promise<void> {
    await this.run(
      'git',
      ['config', 'user.email', 'security@app-audit.local'],
      { cwd: repoPath },
    );
    await this.run('git', ['config', 'user.name', 'App Audit Security Bot'], {
      cwd: repoPath,
    });
  }

  private async deepenClone(repoPath: string, defaultBranch: string): Promise<void> {
    await this.run(
      'git',
      ['fetch', 'origin', defaultBranch, '--deepen', '50'],
      { cwd: repoPath, timeout: 120_000 },
    ).catch(() => undefined);
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
      targetVersion === 'latest'
        ? await this.resolveLatestNpmVersion(packageName)
        : targetVersion.startsWith('^') || targetVersion.startsWith('~')
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
    const normalized = packageName.trim();
    if (this.looksLikeInvalidPackageName(normalized)) {
      throw new Error(
        `Nome de pacote inválido (${normalized}). Reexecute a auditoria ou informe o nome correto do pacote.`,
      );
    }

    const manifests =
      manifestPath === 'package.json'
        ? await this.findPackageManifests(repoPath)
        : [manifestPath];

    for (const manifest of manifests) {
      if (await this.tryRemoveFromManifest(repoPath, manifest, normalized)) {
        return;
      }
    }

    throw new Error(
      `Pacote ${normalized} não encontrado como dependência direta em package.json (pode ser dependência transitiva)`,
    );
  }

  private looksLikeInvalidPackageName(name: string): boolean {
    return name.includes('://') || name.includes('opensourcemalware.com');
  }

  private async findPackageManifests(repoPath: string): Promise<string[]> {
    const manifests: string[] = [];
    await this.collectPackageManifests(repoPath, repoPath, '', manifests);
    return manifests.length > 0 ? manifests : ['package.json'];
  }

  private async collectPackageManifests(
    repoPath: string,
    currentDir: string,
    relativeDir: string,
    manifests: string[],
  ): Promise<void> {
    const manifestRelative = relativeDir
      ? `${relativeDir.replace(/\\/g, '/')}/package.json`
      : 'package.json';

    try {
      await access(join(currentDir, 'package.json'));
      if (!manifests.includes(manifestRelative)) {
        manifests.push(manifestRelative);
      }
    } catch {
      // sem package.json neste diretório
    }

    let entries: Array<{ name: string; isDirectory: () => boolean }>;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
        continue;
      }
      const nextRelative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      await this.collectPackageManifests(
        repoPath,
        join(currentDir, entry.name),
        nextRelative,
        manifests,
      );
    }
  }

  private async tryRemoveFromManifest(
    repoPath: string,
    manifestPath: string,
    packageName: string,
  ): Promise<boolean> {
    const fullPath = join(repoPath, manifestPath);
    try {
      await access(fullPath);
    } catch {
      return false;
    }

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
    if (!removed) return false;
    await writeFile(fullPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
    return true;
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

  async resolveLatestNpmVersion(packageName: string): Promise<string> {
    try {
      const { stdout } = await this.run(
        'npm',
        ['view', packageName, 'version', '--registry', 'https://registry.npmjs.org'],
        { timeout: 60_000 },
      );
      const version = stdout.trim();
      if (!version || version === 'undefined') return 'latest';
      return version.startsWith('^') || version.startsWith('~')
        ? version
        : `^${version}`;
    } catch (error) {
      this.logger.warn(
        `npm view falhou para ${packageName}: ${(error as Error).message}`,
      );
      return 'latest';
    }
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

    const branch = `security/app-audit-${Date.now()}`;
    await this.run('git', ['checkout', '-b', branch], { cwd: repoPath });
    await this.run('git', ['add', '-A'], { cwd: repoPath });

    const staged = await this.run('git', ['diff', '--cached', '--name-only'], {
      cwd: repoPath,
    });
    if (!staged.stdout.trim()) {
      return {
        method: 'no_changes',
        branch: defaultBranch,
        lockfilesUpdated: [],
      };
    }

    await this.run('git', ['commit', '-m', commitMessage], { cwd: repoPath });

    const sha = (
      await this.run('git', ['rev-parse', 'HEAD'], { cwd: repoPath })
    ).stdout.trim();

    const ahead = (
      await this.run('git', ['rev-list', '--count', `${defaultBranch}..HEAD`], {
        cwd: repoPath,
      })
    ).stdout.trim();
    if (ahead === '0') {
      return {
        method: 'no_changes',
        branch: defaultBranch,
        lockfilesUpdated: [],
      };
    }

    try {
      await this.run('git', ['push', 'origin', `${branch}:${defaultBranch}`], {
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

    await this.pushBranchWithRetry(repoPath, branch);

    const aheadOnRemote = await this.compareBranchesAhead(
      owner,
      repo,
      defaultBranch,
      branch,
    );
    if (aheadOnRemote === 0) {
      const onBase = await this.isCommitOnBranch(
        owner,
        repo,
        sha,
        defaultBranch,
      );
      this.logger.warn(
        onBase
          ? `Branch ${branch} ≡ ${defaultBranch}; commit ${sha.slice(0, 7)} já na base.`
          : `Branch ${branch} ≡ ${defaultBranch} após push; nenhum diff remoto.`,
      );
      return {
        method: onBase ? 'direct_push' : 'no_changes',
        branch: defaultBranch,
        commitSha: sha,
        lockfilesUpdated: [],
      };
    }

    const prUrl = await this.createPullRequest(
      owner,
      repo,
      branch,
      defaultBranch,
      prTitle,
      prBody,
    );
    if (!prUrl) {
      return {
        method: 'no_changes',
        branch: defaultBranch,
        commitSha: sha,
        lockfilesUpdated: [],
      };
    }
    return {
      method: 'pull_request',
      branch,
      pullRequestUrl: prUrl,
      commitSha: sha,
      lockfilesUpdated: [],
    };
  }

  private async pushBranchWithRetry(
    repoPath: string,
    branch: string,
  ): Promise<void> {
    try {
      await this.run('git', ['push', '-u', 'origin', branch], {
        cwd: repoPath,
        timeout: 120_000,
      });
    } catch (firstError) {
      this.logger.warn(
        `Push da branch falhou, tentando deepen/unshallow: ${(firstError as Error).message}`,
      );
      await this.run('git', ['fetch', 'origin', '--unshallow'], {
        cwd: repoPath,
        timeout: 120_000,
      }).catch(() =>
        this.run('git', ['fetch', 'origin', '--deepen', '50'], {
          cwd: repoPath,
          timeout: 120_000,
        }),
      );
      await this.run('git', ['push', '-u', 'origin', branch], {
        cwd: repoPath,
        timeout: 120_000,
      });
    }
  }

  private formatExecError(error: unknown): string {
    if (!(error instanceof Error)) return sanitizeGitError(String(error));
    const execErr = error as Error & { stderr?: string | Buffer };
    const stderr = execErr.stderr
      ? Buffer.isBuffer(execErr.stderr)
        ? execErr.stderr.toString()
        : execErr.stderr
      : '';
    return sanitizeGitError([error.message, stderr].filter(Boolean).join(' '));
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

  private async compareBranchesAhead(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<number> {
    try {
      const { stdout } = await this.runGh([
        'api',
        `repos/${owner}/${repo}/compare/${base}...${head}`,
        '--jq',
        '.ahead_by',
      ]);
      return Number.parseInt(stdout.trim(), 10) || 0;
    } catch {
      return -1;
    }
  }

  private async isCommitOnBranch(
    owner: string,
    repo: string,
    sha: string,
    branch: string,
  ): Promise<boolean> {
    try {
      const { stdout: branchSha } = await this.runGh([
        'api',
        `repos/${owner}/${repo}/git/ref/heads/${branch}`,
        '--jq',
        '.object.sha',
      ]);
      if (branchSha.trim() === sha) return true;
      const { stdout: status } = await this.runGh([
        'api',
        `repos/${owner}/${repo}/compare/${sha}...${branch}`,
        '--jq',
        '.status',
      ]);
      const normalized = status.trim();
      return normalized === 'behind' || normalized === 'identical';
    } catch {
      return false;
    }
  }

  private async createPullRequest(
    owner: string,
    repo: string,
    head: string,
    base: string,
    title: string,
    body: string,
  ): Promise<string | null> {
    const ahead = await this.compareBranchesAhead(owner, repo, base, head);
    if (ahead === 0) {
      return null;
    }

    try {
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
    } catch (prError) {
      const msg = this.formatExecError(prError);
      if (/No commits between/i.test(msg)) {
        return null;
      }
      throw prError;
    }
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
    try {
      return await execFileAsync(cmd, args, {
        maxBuffer: 50 * 1024 * 1024,
        windowsHide: true,
        env,
        cwd: opts.cwd,
        timeout: opts.timeout ?? 120_000,
      });
    } catch (error: unknown) {
      const err = error as Error & { stderr?: string | Buffer };
      const stderr = err.stderr
        ? Buffer.isBuffer(err.stderr)
          ? err.stderr.toString()
          : err.stderr
        : '';
      throw new Error(
        sanitizeGitError([err.message, stderr].filter(Boolean).join(' ')),
      );
    }
  }
}
