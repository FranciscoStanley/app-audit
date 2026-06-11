import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LEGAL_POLICY_VERSION } from '../../domain/constants/legal-policy.constants';

export type ConsentKind = 'github_oauth' | 'email_login' | 'remediation';

export interface ConsentAcknowledgments {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  dataProcessingAccepted: boolean;
  scopesAcknowledged?: boolean;
  remediationAcknowledged?: boolean;
  risksAcknowledged?: boolean;
}

export interface ConsentRecord {
  id: string;
  kind: ConsentKind;
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
    kind: ConsentKind,
    acknowledgments: ConsentAcknowledgments,
    scopes: string[],
    meta: { ip?: string; userAgent?: string },
  ): Promise<ConsentRecord> {
    const record: ConsentRecord = {
      id: randomUUID(),
      kind,
      policyVersion: LEGAL_POLICY_VERSION,
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

  async createCompleted(
    kind: ConsentKind,
    userId: string,
    acknowledgments: ConsentAcknowledgments,
    meta: { ip?: string; userAgent?: string },
    scopes: string[] = [],
  ): Promise<ConsentRecord> {
    const record: ConsentRecord = {
      id: randomUUID(),
      kind,
      policyVersion: LEGAL_POLICY_VERSION,
      scopes,
      acknowledgments,
      acceptedAt: new Date().toISOString(),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      userId,
      githubId: null,
      status: 'completed',
      revokedAt: null,
    };
    const store = await this.load();
    store.records.push(record);
    await this.persist(store);
    return record;
  }

  async complete(
    consentId: string,
    userId: string,
    githubId: string,
  ): Promise<void> {
    const store = await this.load();
    const record = store.records.find((r) => r.id === consentId);
    if (!record) return;
    record.status = 'completed';
    record.userId = userId;
    record.githubId = githubId;
    await this.persist(store);
  }

  async revokeByUser(userId: string, kind?: ConsentKind): Promise<void> {
    const store = await this.load();
    const now = new Date().toISOString();
    for (const record of store.records) {
      if (
        record.userId === userId &&
        record.status === 'completed' &&
        (!kind || record.kind === kind)
      ) {
        record.status = 'revoked';
        record.revokedAt = now;
      }
    }
    await this.persist(store);
  }

  async hasActiveConsent(
    userId: string,
    kind: ConsentKind,
    policyVersion = LEGAL_POLICY_VERSION,
  ): Promise<boolean> {
    const store = await this.load();
    return store.records.some(
      (r) =>
        r.userId === userId &&
        r.kind === kind &&
        r.status === 'completed' &&
        r.policyVersion === policyVersion,
    );
  }

  async getById(id: string): Promise<ConsentRecord | null> {
    const store = await this.load();
    return store.records.find((r) => r.id === id) ?? null;
  }

  private async load(): Promise<ConsentStoreFile> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as ConsentStoreFile;
      for (const record of parsed.records) {
        if (!record.kind) {
          record.kind = 'github_oauth';
        }
      }
      return parsed;
    } catch {
      return { version: 1, records: [] };
    }
  }

  private async persist(store: ConsentStoreFile): Promise<void> {
    await mkdir(join(this.filePath, '..'), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(store, null, 2), 'utf-8');
  }
}
