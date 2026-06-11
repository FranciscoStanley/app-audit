import { Injectable } from '@nestjs/common';
import { GitHubRemediationPort } from '../../domain/ports/github-remediation.port';
import { GhCliRemediationAdapter } from './gh-cli-remediation.adapter';

@Injectable()
export class GitHubRemediationFactory {
  create(accessToken?: string | null): GitHubRemediationPort {
    const token = accessToken?.trim() || process.env.GITHUB_TOKEN?.trim() || undefined;
    return new GhCliRemediationAdapter(token);
  }
}
