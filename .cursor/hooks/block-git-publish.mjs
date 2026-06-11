#!/usr/bin/env node
/**
 * Bloqueia git commit/push/add sem confirmação explícita.
 * Hook: beforeShellExecution — retorna "ask" para publicação Git.
 */
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf-8'));
const command = String(input.command ?? '');

const blocked = /\bgit\s+(commit|push|add|restore|reset|clean)\b/i.test(command);
const readOnlyGit = /\bgit\s+(status|diff|log|branch|show|check-ignore|ls-files|rev-parse|describe)\b/i.test(
  command,
);

if (blocked && !readOnlyGit) {
  const payload = {
    permission: 'ask',
    user_message:
      'Commit/push Git requer sua autorização manual. Confirme apenas se deseja publicar alterações.',
    agent_message:
      'O hook do projeto bloqueia git commit/push/add automaticamente. Aguarde pedido explícito do usuário.',
  };
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}

process.stdout.write(JSON.stringify({ permission: 'allow' }));
process.exit(0);
