import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  GitHubFileContent,
  GitHubRepositoryInfo,
  GitHubRepositoryPort,
} from '../../domain/ports/github-repository.port';

const execFileAsync = promisify(execFile);

@Injectable()
export class GhCliGitHubAdapter implements GitHubRepositoryPort {
  private readonly logger = new Logger(GhCliGitHubAdapter.name);

  constructor(private readonly accessToken?: string) {}

  async getAuthenticatedUser(): Promise<string> {
    const { stdout } = await this.runGh(['api', 'user', '--jq', '.login']);
    return stdout.trim();
  }

  async listRepositories(): Promise<GitHubRepositoryInfo[]> {
    const { stdout } = await this.runGh([
      'api',
      'user/repos',
      '--paginate',
      '--jq',
      '[.[] | {name, full_name, private, html_url, language, topics, updated_at, default_branch}]',
    ]);

    const parsed = JSON.parse(stdout) as Array<Record<string, unknown>>;
    const flat = Array.isArray(parsed[0]) ? parsed.flat() : parsed;

    return flat.map((raw) => ({
      name: String(raw.name),
      fullName: String(raw.full_name),
      isPrivate: Boolean(raw.private),
      url: String(raw.html_url),
      language: typeof raw.language === 'string' ? raw.language : null,
      topics: Array.isArray(raw.topics) ? raw.topics.map(String) : [],
      updatedAt: String(raw.updated_at),
      defaultBranch:
        typeof raw.default_branch === 'string' ? raw.default_branch : 'main',
    }));
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<GitHubFileContent | null> {
    try {
      const args = [
        'api',
        `repos/${owner}/${repo}/contents/${path}`,
        '--jq',
        '{path: .path, content: .content, encoding: .encoding}',
      ];
      if (ref) args.push('-f', `ref=${ref}`);

      const { stdout } = await this.runGh(args);
      const data = JSON.parse(stdout) as GitHubFileContent;
      if (data.encoding === 'base64' && data.content) {
        data.content = Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return data;
    } catch {
      return null;
    }
  }

  async searchFileInRepo(
    owner: string,
    repo: string,
    filename: string,
  ): Promise<boolean> {
    try {
      const { stdout } = await this.runGh([
        'api',
        `repos/${owner}/${repo}/contents/${filename}`,
        '--jq',
        '.name',
      ]);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  async getPackageJson(
    owner: string,
    repo: string,
  ): Promise<Record<string, unknown> | null> {
    const file = await this.getFileContent(owner, repo, 'package.json');
    if (!file?.content) return null;
    try {
      return JSON.parse(file.content) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  async getRequirementsTxt(
    owner: string,
    repo: string,
  ): Promise<string | null> {
    const paths = [
      'requirements.txt',
      'requirements-dev.txt',
      'pyproject.toml',
    ];
    for (const path of paths) {
      const file = await this.getFileContent(owner, repo, path);
      if (file?.content) return file.content;
    }
    return null;
  }

  async listWorkflowFiles(owner: string, repo: string): Promise<string[]> {
    try {
      const { stdout } = await this.runGh([
        'api',
        `repos/${owner}/${repo}/contents/.github/workflows`,
        '--jq',
        '.[].path',
      ]);
      return stdout
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async getWorkflowContent(
    owner: string,
    repo: string,
    path: string,
  ): Promise<string | null> {
    const file = await this.getFileContent(owner, repo, path);
    return file?.content ?? null;
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
      });
    } catch (error: unknown) {
      const err = error as { stderr?: string; message?: string };
      throw new Error(err.stderr?.trim() || err.message || 'gh command failed');
    }
  }
}
