import { BadRequestException, Injectable } from '@nestjs/common';
import { GitHubConnectionStore } from '../../infrastructure/auth/github-connection.store';

@Injectable()
export class GitHubTokenResolverService {
  constructor(private readonly connections: GitHubConnectionStore) {}

  async resolveForUser(userId: string): Promise<string | undefined> {
    const userToken = await this.connections.getAccessToken(userId);
    if (userToken) return userToken;

    const fallback = process.env.GITHUB_TOKEN?.trim();
    return fallback || undefined;
  }

  async requireForAudit(userId: string): Promise<string> {
    const token = await this.resolveForUser(userId);
    if (!token) {
      throw new BadRequestException(
        'Conecte sua conta GitHub (Login com GitHub) ou configure GITHUB_TOKEN no servidor para executar auditorias.',
      );
    }
    return token;
  }
}
