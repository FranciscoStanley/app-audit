const INSECURE_JWT_SECRETS = new Set([
  'change-me-in-production',
  'app-audit-dev-secret-change-in-production',
]);

export function validateProductionEnv(): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv !== 'production') return;

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret || jwtSecret.length < 32 || INSECURE_JWT_SECRETS.has(jwtSecret)) {
    throw new Error(
      'NODE_ENV=production exige JWT_SECRET com pelo menos 32 caracteres e valor seguro.',
    );
  }

  if (!process.env.GITHUB_TOKEN?.trim()) {
    throw new Error('NODE_ENV=production exige GITHUB_TOKEN configurado.');
  }

  const cors = process.env.CORS_ORIGIN?.trim();
  if (!cors || cors === '*') {
    throw new Error('NODE_ENV=production exige CORS_ORIGIN com a URL exata do frontend.');
  }
}

export function isProduction(): boolean {
  return (process.env.NODE_ENV ?? 'development') === 'production';
}

export function isSwaggerEnabled(): boolean {
  if (!isProduction()) return true;
  return process.env.SWAGGER_ENABLED === 'true';
}
