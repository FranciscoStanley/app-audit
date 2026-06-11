import { Injectable } from '@nestjs/common';
import { GitHubRepositoryPort } from '../../domain/ports/github-repository.port';
import { GhCliGitHubAdapter } from './gh-cli-github.adapter';

@Injectable()
export class GitHubAdapterFactory {
  create(accessToken?: string | null): GitHubRepositoryPort {
    const token = accessToken?.trim() || process.env.GITHUB_TOKEN?.trim() || undefined;
    return new GhCliGitHubAdapter(token);
  }
}
