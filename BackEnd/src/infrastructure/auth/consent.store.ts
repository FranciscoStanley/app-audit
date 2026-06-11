import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GITHUB_OAUTH_POLICY_VERSION } from '../../domain/constants/github-oauth-consent.constants';

export interface ConsentAcknowledgments {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  dataProcessingAccepted: boolean;
  scopesAcknowledged: boolean;
}

export interface ConsentRecord {
  id: string;
  policyVersion: string;
  scopes: string[];
  acknowledgments: ConsentAcknowledgments;
  acceptedAt: string;
  ip: string | null;
  userAgent: string | null;
  userId: string | null;
  githubId: string | null;
  status: 'pending' | 'completed' | 'revoked';
  revokedAt: string | null;
}

interface ConsentStoreFile {
  version: 1;
  records: ConsentRecord[];
}

@Injectable()
export class ConsentStore {
  private readonly filePath = join(process.cwd(), 'data', 'consents.json');

  async createPending(
    acknowledgments: ConsentAcknowledgments,
    scopes: string[],
    meta: { ip?: string; userAgent?: string },
  ): Promise<ConsentRecord> {
    const record: ConsentRecord = {
      id: randomUUID(),
      policyVersion: GITHUB_OAUTH_POLICY_VERSION,
      scopes,
      acknowledgments,
      acceptedAt: new Date().toISOString(),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      userId: null,
      githubId: null,
      status: 'pending',
      revokedAt: null,
    };
    const store = await this.load();
    store.records.push(record);
    await this.persist(store);
    return record;
  }

  async complete(consentId: string, userId: string, githubId: string): Promise<void> {
    const store = await this.load();
    const record = store.records.find((r) => r.id === consentId);
    if (!record) return;
    record.status = 'completed';
    record.userId = userId;
    record.githubId = githubId;
    await this.persist(store);
  }

  async revokeByUser(userId: string): Promise<void> {
    const store = await this.load();
    const now = new Date().toISOString();
    for (const record of store.records) {
      if (record.userId === userId && record.status === 'completed') {
        record.status = 'revoked';
        record.revokedAt = now;
      }
    }
    await this.persist(store);
  }

  async getById(id: string): Promise<ConsentRecord | null> {
    const store = await this.load();
    return store.records.find((r) => r.id === id) ?? null;
  }

  private async load(): Promise<ConsentStoreFile> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as ConsentStoreFile;
    } catch {
      return { version: 1, records: [] };
    }
  }

  private async persist(store: ConsentStoreFile): Promise<void> {
    await mkdir(join(this.filePath, '..'), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(store, null, 2), 'utf-8');
  }
}
