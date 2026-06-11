import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decryptToken, encryptToken } from './token-cipher';

export interface GitHubConnection {
  githubId: string;
  githubUsername: string;
  connectedAt: string;
}

interface StoreFile {
  version: 1;
  tokens: Record<string, string>;
  connections: Record<string, GitHubConnection>;
}

@Injectable()
export class GitHubConnectionStore {
  private readonly filePath = join(process.cwd(), 'data', 'github-connections.json');

  constructor(private readonly config: ConfigService) {}

  private cipherSecret(): string {
    return this.config.get<string>('JWT_SECRET') ?? 'app-audit-dev-secret-change-in-production';
  }

  async saveConnection(
    userId: string,
    data: { githubId: string; githubUsername: string; accessToken: string },
  ): Promise<void> {
    const store = await this.load();
    store.connections[userId] = {
      githubId: data.githubId,
      githubUsername: data.githubUsername,
      connectedAt: new Date().toISOString(),
    };
    store.tokens[userId] = encryptToken(data.accessToken, this.cipherSecret());
    await this.persist(store);
  }

  async getConnection(userId: string): Promise<GitHubConnection | null> {
    const store = await this.load();
    return store.connections[userId] ?? null;
  }

  async getAccessToken(userId: string): Promise<string | null> {
    const store = await this.load();
    const enc = store.tokens[userId];
    if (!enc) return null;
    try {
      return decryptToken(enc, this.cipherSecret());
    } catch {
      return null;
    }
  }

  async removeConnection(userId: string): Promise<void> {
    const store = await this.load();
    delete store.tokens[userId];
    delete store.connections[userId];
    await this.persist(store);
  }

  private async load(): Promise<StoreFile> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as StoreFile;
    } catch {
      return { version: 1, tokens: {}, connections: {} };
    }
  }

  private async persist(store: StoreFile): Promise<void> {
    await mkdir(join(this.filePath, '..'), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(store, null, 2), 'utf-8');
  }
}
