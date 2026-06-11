import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function getGhToken(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('gh', ['auth', 'token'], {
      windowsHide: true,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function main() {
  const envPath = '.env';

  try {
    await readFile(envPath, 'utf-8');
    console.log('.env já existe — não sobrescrito.');
    return;
  } catch {
    // create new
  }

  const example = await readFile('.env.example', 'utf-8');
  const ghToken = await getGhToken();
  const jwtSecret = randomBytes(48).toString('base64');

  let env = example
    .replace('JWT_SECRET=', `JWT_SECRET=${jwtSecret}`)
    .replace('NODE_ENV=development', 'NODE_ENV=development');

  if (ghToken) {
    env = env.replace('GITHUB_TOKEN=', `GITHUB_TOKEN=${ghToken}`);
    console.log('GITHUB_TOKEN preenchido via gh auth token.');
  } else {
    console.log(
      'gh não autenticado — configure GITHUB_TOKEN manualmente ou execute gh auth login.',
    );
  }

  await writeFile(envPath, env, 'utf-8');
  console.log('.env criado com JWT_SECRET gerado.');
  console.log('');
  console.log('Próximos passos:');
  console.log(
    '  1. Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env (mín. 12 caracteres)',
  );
  console.log(
    '     OU execute: npm run users:create -- --email ... --password ... --name ... --role admin',
  );
  console.log('  2. Adicione OSM_API_TOKEN (opcional) para OpenSourceMalware');
}

main().catch((err) => {
  console.error('Setup falhou:', err.message);
  process.exit(1);
});
