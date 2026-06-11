import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import { GitHubRemediationPort } from '../../domain/ports/github-remediation.port';
import { GhCliRemediationAdapter } from './gh-cli-remediation.adapter';
import { RemediationGitWorkspace } from './remediation-git-workspace';

@Injectable()
export class GitHubRemediationFactory {
  create(accessToken?: string | null): GitHubRemediationPort {
    const token = accessToken?.trim() || process.env.GITHUB_TOKEN?.trim() || undefined;
    return new GhCliRemediationAdapter(token);
  }

  createWorkspace(accessToken?: string | null): RemediationGitWorkspace {
    const token = accessToken?.trim() || process.env.GITHUB_TOKEN?.trim() || '';
    return new RemediationGitWorkspace(token, join(process.cwd(), 'data', 'remediation-workspace'));
  }
}
