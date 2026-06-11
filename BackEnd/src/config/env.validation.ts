import { resolveJwtSecret } from './jwt-secret';

export function validateProductionEnv(): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv !== 'production') return;

  resolveJwtSecret();

  if (!process.env.GITHUB_TOKEN?.trim()) {
    throw new Error('NODE_ENV=production exige GITHUB_TOKEN configurado.');
  }

  const cors = process.env.CORS_ORIGIN?.trim();
  if (!cors || cors === '*') {
    throw new Error(
      'NODE_ENV=production exige CORS_ORIGIN com a URL exata do frontend.',
    );
  }

  const oauthClientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  const oauthSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim();
  if (oauthClientId && !oauthSecret) {
    throw new Error(
      'GITHUB_OAUTH_CLIENT_SECRET é obrigatório quando GITHUB_OAUTH_CLIENT_ID está definido.',
    );
  }
  if (oauthSecret && !oauthClientId) {
    throw new Error(
      'GITHUB_OAUTH_CLIENT_ID é obrigatório quando GITHUB_OAUTH_CLIENT_SECRET está definido.',
    );
  }

  const frontendUrl = process.env.FRONTEND_URL?.trim();
  if (oauthClientId && !frontendUrl) {
    throw new Error(
      'FRONTEND_URL é obrigatório em produção quando OAuth GitHub está habilitado.',
    );
  }
}

export function isProduction(): boolean {
  return (process.env.NODE_ENV ?? 'development') === 'production';
}

export function isSwaggerEnabled(): boolean {
  if (!isProduction()) return true;
  return process.env.SWAGGER_ENABLED === 'true';
}
