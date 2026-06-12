import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import * as bcrypt from 'bcryptjs';
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
  const name = args.name?.trim();
  const role = args.role as UserRole | undefined;
  const password = args.password;

  if (!email) {
    console.error(
      'Uso: npm run users:update -- --email x@empresa.com [--name "Nome"] [--role admin|auditor|viewer] [--password "SenhaForte123!"]',
    );
    process.exit(1);
  }

  if (role && !Object.values(UserRole).includes(role)) {
    console.error(`Role inválida. Use: ${Object.values(UserRole).join(', ')}`);
    process.exit(1);
  }

  if (password && password.length < 12) {
    console.error('Senha deve ter no mínimo 12 caracteres.');
    process.exit(1);
  }

  if (!name && !role && !password) {
    console.error('Informe ao menos um campo: --name, --role ou --password');
    process.exit(1);
  }

  const filePath = join(process.cwd(), 'data', 'users.json');
  await mkdir(join(filePath, '..'), { recursive: true });

  let users: User[] = [];
  try {
    const raw = await readFile(filePath, 'utf-8');
    users = (JSON.parse(raw) as { users: User[] }).users ?? [];
  } catch {
    console.error('Arquivo data/users.json não encontrado.');
    process.exit(1);
  }

  const index = users.findIndex((u) => u.email === email);
  if (index < 0) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  const user = users[index]!;

  if (role && role !== user.role) {
    const adminCount = users.filter((u) => u.role === UserRole.ADMIN).length;
    if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN && adminCount <= 1) {
      console.error('Não é possível rebaixar o último administrador.');
      process.exit(1);
    }
    user.role = role;
  }

  if (name) {
    user.name = name;
  }

  if (password) {
    user.passwordHash = await bcrypt.hash(password, 12);
  }

  users[index] = user;
  await writeFile(
    filePath,
    JSON.stringify({ version: 1, users }, null, 2),
    'utf-8',
  );

  console.log(`Usuário atualizado: ${email}${role ? ` → ${role}` : ''}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
