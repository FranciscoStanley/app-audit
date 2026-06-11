import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

interface CodeEntry {
  accessToken: string;
  expiresAt: number;
}

const TTL_MS = 2 * 60 * 1000;

@Injectable()
export class OAuthCodeStore {
  private readonly codes = new Map<string, CodeEntry>();

  issue(accessToken: string): string {
    this.purgeExpired();
    const code = randomBytes(32).toString('hex');
    this.codes.set(code, { accessToken, expiresAt: Date.now() + TTL_MS });
    return code;
  }

  exchange(code: string): string {
    this.purgeExpired();
    const entry = this.codes.get(code);
    if (!entry || entry.expiresAt < Date.now()) {
      throw new UnauthorizedException('Código OAuth inválido ou expirado');
    }
    this.codes.delete(code);
    return entry.accessToken;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [code, entry] of this.codes) {
      if (entry.expiresAt < now) this.codes.delete(code);
    }
  }
}
