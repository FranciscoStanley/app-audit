import type { ConfigService } from '@nestjs/config';
import { isProduction } from './env.validation';

const INSECURE_JWT_SECRETS = new Set([
  'change-me-in-production',
  'app-audit-dev-secret-change-in-production',
]);

const DEV_FALLBACK = 'app-audit-dev-secret-change-in-production';

export function resolveJwtSecret(config?: ConfigService): string {
  const secret = (
    config?.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET
  )?.trim();

  if (!secret) {
    if (isProduction()) {
      throw new Error('JWT_SECRET é obrigatório em produção.');
    }
    return DEV_FALLBACK;
  }

  if (
    isProduction() &&
    (secret.length < 32 || INSECURE_JWT_SECRETS.has(secret))
  ) {
    throw new Error(
      'JWT_SECRET em produção deve ter 32+ caracteres e não pode usar valores padrão.',
    );
  }

  return secret;
}
