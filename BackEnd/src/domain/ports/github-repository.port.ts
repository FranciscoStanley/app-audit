export interface GitHubRepositoryInfo {
  name: string;
  fullName: string;
  isPrivate: boolean;
  url: string;
  language: string | null;
  topics: string[];
  updatedAt: string;
  defaultBranch: string;
}

export interface GitHubFileContent {
  path: string;
  content: string;
  encoding: string;
}

export interface GitHubRepositoryPort {
  getAuthenticatedUser(): Promise<string>;
  listRepositories(): Promise<GitHubRepositoryInfo[]>;
  getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<GitHubFileContent | null>;
  searchFileInRepo(
    owner: string,
    repo: string,
    filename: string,
  ): Promise<boolean>;
  getPackageJson(
    owner: string,
    repo: string,
  ): Promise<Record<string, unknown> | null>;
  getRequirementsTxt(owner: string, repo: string): Promise<string | null>;
  listWorkflowFiles(owner: string, repo: string): Promise<string[]>;
  getWorkflowContent(
    owner: string,
    repo: string,
    path: string,
  ): Promise<string | null>;
}

export const GITHUB_REPOSITORY_PORT = Symbol('GITHUB_REPOSITORY_PORT');
