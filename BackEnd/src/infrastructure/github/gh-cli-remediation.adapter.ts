import { Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  DependabotAlert,
  GitHubRemediationPort,
} from '../../domain/ports/github-remediation.port';

const execFileAsync = promisify(execFile);

interface FileMeta {
  sha: string;
  content: string;
}

export class GhCliRemediationAdapter implements GitHubRemediationPort {
  private readonly logger = new Logger(GhCliRemediationAdapter.name);

  constructor(private readonly accessToken?: string) {}

  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const { stdout } = await this.runGh([
      'api',
      `repos/${owner}/${repo}`,
      '--jq',
      '.default_branch',
    ]);
    return stdout.trim() || 'main';
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
  ): Promise<void> {
    const meta = await this.getFileMeta(owner, repo, path);
    if (!meta) return;

    await this.runGh([
      'api',
      `repos/${owner}/${repo}/contents/${path}`,
      '-X',
      'DELETE',
      '-f',
      `message=${message}`,
      '-f',
      `sha=${meta.sha}`,
    ]);
  }

  async ensureGitignoreEntry(
    owner: string,
    repo: string,
    entry: string,
  ): Promise<void> {
    const normalized = entry.replace(/^\//, '');
    const meta = await this.getFileMeta(owner, repo, '.gitignore');
    const lines = meta?.content.split('\n') ?? [];
    const trimmedEntry = normalized.trim();

    if (lines.some((line) => line.trim() === trimmedEntry)) return;

    const updated = [
      ...lines.filter((l) => l.length > 0),
      trimmedEntry,
      '',
    ].join('\n');
    await this.putFileContent(
      owner,
      repo,
      '.gitignore',
      updated,
      `security: add ${trimmedEntry} to .gitignore`,
      meta?.sha,
    );
  }

  async pinWorkflowActions(
    owner: string,
    repo: string,
    workflowPath: string,
  ): Promise<number> {
    const meta = await this.getFileMeta(owner, repo, workflowPath);
    if (!meta) return 0;

    const actionRefRegex =
      /uses:\s*([^\s@/]+\/[^\s@]+)@(v[\d.]+|main|master)\b/gi;
    let pinned = 0;
    let content = meta.content;

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

    if (pinned === 0) return 0;

    await this.putFileContent(
      owner,
      repo,
      workflowPath,
      content,
      `security: pin GitHub Actions by commit SHA in ${workflowPath}`,
      meta.sha,
    );
    return pinned;
  }

  async removeMaliciousContent(
    owner: string,
    repo: string,
    path: string,
    patterns: string[],
  ): Promise<void> {
    const meta = await this.getFileMeta(owner, repo, path);
    if (!meta) {
      await this.deleteFile(
        owner,
        repo,
        path,
        `security: remove malicious file ${path}`,
      );
      return;
    }

    const filteredLines = meta.content
      .split('\n')
      .filter((line) => !patterns.some((pattern) => line.includes(pattern)));

    const content = filteredLines.join('\n');

    if (content.trim() === meta.content.trim()) {
      await this.deleteFile(
        owner,
        repo,
        path,
        `security: remove malicious file ${path}`,
      );
      return;
    }

    await this.putFileContent(
      owner,
      repo,
      path,
      content,
      `security: remove malicious content from ${path}`,
      meta.sha,
    );
  }

  async fixDependabotAlert(
    owner: string,
    repo: string,
    alertNumber: number,
  ): Promise<void> {
    const alert = await this.getDependabotAlert(owner, repo, alertNumber);
    if (!alert.patchedVersion) {
      throw new Error(
        `Alerta #${alertNumber} não possui versão corrigida disponível`,
      );
    }

    await this.updatePackageVersion(
      owner,
      repo,
      alert.packageName,
      alert.patchedVersion,
      alert.manifestPath,
    );
  }

  async updatePackageVersion(
    owner: string,
    repo: string,
    packageName: string,
    targetVersion: string,
    manifestPath = 'package.json',
  ): Promise<void> {
    const meta = await this.getFileMeta(owner, repo, manifestPath);
    if (!meta) {
      throw new Error(`Manifesto ${manifestPath} não encontrado`);
    }

    const pkg = JSON.parse(meta.content) as Record<
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

    await this.putFileContent(
      owner,
      repo,
      manifestPath,
      `${JSON.stringify(pkg, null, 2)}\n`,
      `security: update ${packageName} to ${version}`,
      meta.sha,
    );
  }

  async removePackageFromManifest(
    owner: string,
    repo: string,
    packageName: string,
    manifestPath = 'package.json',
  ): Promise<void> {
    const meta = await this.getFileMeta(owner, repo, manifestPath);
    if (!meta) {
      throw new Error(`Manifesto ${manifestPath} não encontrado`);
    }

    const pkg = JSON.parse(meta.content) as Record<
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

    if (!removed) {
      throw new Error(
        `Pacote ${packageName} não encontrado em ${manifestPath}`,
      );
    }

    await this.putFileContent(
      owner,
      repo,
      manifestPath,
      `${JSON.stringify(pkg, null, 2)}\n`,
      `security: remove compromised package ${packageName}`,
      meta.sha,
    );
  }

  async enableDependabotSecurityUpdates(
    owner: string,
    repo: string,
  ): Promise<void> {
    try {
      await this.runGh([
        'api',
        `repos/${owner}/${repo}/vulnerability-alerts`,
        '-X',
        'PUT',
      ]);
    } catch (error) {
      this.logger.warn(`vulnerability-alerts: ${(error as Error).message}`);
    }

    try {
      await this.runGh([
        'api',
        `repos/${owner}/${repo}`,
        '-X',
        'PATCH',
        '-f',
        'security_and_analysis[dependabot_security_updates][status]=enabled',
      ]);
    } catch (error) {
      this.logger.warn(
        `dependabot_security_updates: ${(error as Error).message}`,
      );
    }
  }

  async listDependabotAlerts(
    owner: string,
    repo: string,
  ): Promise<DependabotAlert[]> {
    try {
      const { stdout } = await this.runGh([
        'api',
        `repos/${owner}/${repo}/dependabot/alerts`,
        '--paginate',
        '-f',
        'state=open',
        '-f',
        'per_page=100',
        '--jq',
        '[.[] | {number, state, packageName: .dependency.package.name, manifestPath: .dependency.manifest_path, severity: .security_advisory.severity, summary: .security_advisory.summary, vulnerableVersionRange: .security_vulnerability.vulnerable_version_range, patchedVersion: (.security_vulnerability.first_patched_version.identifier // null), ghsaId: (.security_advisory.ghsa_id // null)}]',
      ]);

      const parsed: unknown = JSON.parse(stdout);
      return this.flattenDependabotAlerts(parsed);
    } catch (error) {
      this.logger.debug(
        `Dependabot alerts indisponíveis para ${owner}/${repo}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async createSecurityIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
  ): Promise<void> {
    await this.runGh([
      'api',
      `repos/${owner}/${repo}/issues`,
      '-X',
      'POST',
      '-f',
      `title=${title}`,
      '-f',
      `body=${body}`,
      '-f',
      'labels[]=security',
    ]);
  }

  private async getDependabotAlert(
    owner: string,
    repo: string,
    alertNumber: number,
  ): Promise<DependabotAlert> {
    const { stdout } = await this.runGh([
      'api',
      `repos/${owner}/${repo}/dependabot/alerts/${alertNumber}`,
      '--jq',
      '{number, state, packageName: .dependency.package.name, manifestPath: .dependency.manifest_path, severity: .security_advisory.severity, summary: .security_advisory.summary, vulnerableVersionRange: .security_vulnerability.vulnerable_version_range, patchedVersion: (.security_vulnerability.first_patched_version.identifier // null), ghsaId: (.security_advisory.ghsa_id // null)}',
    ]);
    return JSON.parse(stdout) as DependabotAlert;
  }

  private async getFileMeta(
    owner: string,
    repo: string,
    path: string,
  ): Promise<FileMeta | null> {
    try {
      const { stdout } = await this.runGh([
        'api',
        `repos/${owner}/${repo}/contents/${path}`,
        '--jq',
        '{sha, content, encoding}',
      ]);
      const data = JSON.parse(stdout) as {
        sha: string;
        content: string;
        encoding: string;
      };
      const content =
        data.encoding === 'base64'
          ? Buffer.from(data.content, 'base64').toString('utf-8')
          : data.content;
      return { sha: data.sha, content };
    } catch {
      return null;
    }
  }

  private async putFileContent(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
  ): Promise<void> {
    const args = [
      'api',
      `repos/${owner}/${repo}/contents/${path}`,
      '-X',
      'PUT',
      '-f',
      `message=${message}`,
      '-f',
      `content=${Buffer.from(content, 'utf-8').toString('base64')}`,
    ];
    if (sha) {
      args.push('-f', `sha=${sha}`);
    }
    await this.runGh(args);
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
        const { stdout: tagObj } = await this.runGh([
          'api',
          result,
          '--jq',
          '.object.sha',
        ]);
        const sha = tagObj.trim();
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

  private flattenDependabotAlerts(raw: unknown): DependabotAlert[] {
    if (!Array.isArray(raw) || raw.length === 0) return [];
    if (Array.isArray(raw[0])) return (raw as DependabotAlert[][]).flat();
    return raw as DependabotAlert[];
  }

  private async runGh(
    args: string[],
  ): Promise<{ stdout: string; stderr: string }> {
    const env = { ...process.env };
    const token = this.accessToken ?? process.env.GITHUB_TOKEN;
    if (token) env.GITHUB_TOKEN = token;

    try {
      return await execFileAsync('gh', args, {
        maxBuffer: 50 * 1024 * 1024,
        windowsHide: true,
        env,
        timeout: 120_000,
      });
    } catch (error: unknown) {
      const err = error as { stderr?: string; message?: string };
      throw new Error(err.stderr?.trim() || err.message || 'gh command failed');
    }
  }
}
