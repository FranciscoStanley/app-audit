import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { User, UserRole } from '../domain/entities/user.entity';

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith('--')) {
      args[key.slice(2)] = argv[i + 1] ?? '';
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const email = args.email?.toLowerCase();
  const password = args.password;
  const name = args.name;
  const role = (args.role ?? 'viewer') as UserRole;

  if (!email || !password || !name) {
    console.error(
      'Uso: npm run users:create -- --email x@empresa.com --password "SenhaForte123!" --name "Nome" --role admin|auditor|viewer',
    );
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('Senha deve ter no mínimo 12 caracteres.');
    process.exit(1);
  }

  if (!Object.values(UserRole).includes(role)) {
    console.error(`Role inválida. Use: ${Object.values(UserRole).join(', ')}`);
    process.exit(1);
  }

  const filePath = join(process.cwd(), 'data', 'users.json');
  await mkdir(join(filePath, '..'), { recursive: true });

  let users: User[] = [];
  try {
    const raw = await readFile(filePath, 'utf-8');
    users = (JSON.parse(raw) as { users: User[] }).users ?? [];
  } catch {
    // novo arquivo
  }

  if (users.some((u) => u.email === email)) {
    console.error('Email já cadastrado.');
    process.exit(1);
  }

  const user: User = {
    id: randomUUID(),
    email,
    name,
    role,
    passwordHash: await bcrypt.hash(password, 12),
  };

  users.push(user);
  await writeFile(
    filePath,
    JSON.stringify({ version: 1, users }, null, 2),
    'utf-8',
  );
  console.log(`Usuário criado: ${email} (${role})`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
