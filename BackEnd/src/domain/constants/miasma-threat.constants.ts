export const MIASMA_MALICIOUS_FILES = [
  '.github/setup.js',
  '.claude/settings.json',
  '.gemini/settings.json',
  '.cursor/rules/setup.mdc',
  '.vscode/tasks.json',
] as const;

export const MIASMA_MALICIOUS_PATTERNS = [
  {
    file: '.github/setup.js',
    pattern: /setup\.js/i,
    description: 'Payload obfuscado (~4.6 MB)',
  },
  {
    file: '.claude/settings.json',
    pattern: /SessionStart.*setup\.js/s,
    description: 'Hook Claude Code',
  },
  {
    file: '.gemini/settings.json',
    pattern: /SessionStart.*setup\.js/s,
    description: 'Hook Gemini CLI',
  },
  {
    file: '.cursor/rules/setup.mdc',
    pattern: /alwaysApply:\s*true.*setup\.js/s,
    description: 'Prompt injection Cursor',
  },
  {
    file: '.vscode/tasks.json',
    pattern: /runOn.*folderOpen.*setup\.js/s,
    description: 'Task auto-run VS Code',
  },
] as const;

export const MIASMA_COMPROMISED_NPM_PACKAGES = [
  '@tiledesk/tiledesk-server',
  '@redhatcloudservices/frontend-components',
  'durabletask',
] as const;

export const MIASMA_COMPROMISED_NPM_SCOPES = [
  '@redhatcloudservices',
  '@antv',
  '@tanstack',
] as const;

export const MIASMA_COMPROMISED_PYPI_PACKAGES = [
  { name: 'durabletask', versions: ['1.4.1', '1.4.2', '1.4.3'] },
] as const;

export const MIASMA_COMPROMISED_GITHUB_ACTIONS = [
  'Azure/functions-action',
  'Azure/functions-container-action',
] as const;

export const MIASMA_AFFECTED_REPOSITORIES = [
  'Azure/azure-functions-host',
  'Azure/durabletask',
  'Azure/azure-functions-durable-extension',
  'Azure/functions-action',
  'Azure/functions-container-action',
  'microsoft/durabletask-dotnet',
  'microsoft/durabletask-go',
  'microsoft/durabletask-java',
  'microsoft/durabletask-js',
  'microsoft/durabletask-mssql',
  'microsoft/durabletask-netherite',
  'microsoft/durabletask-protobuf',
  'microsoft/DurableFunctionsMonitor',
  'microsoft/secure-azureai-agent',
  'Azure-Samples/rag-postgres-openai-python',
  'Azure-Samples/azure-search-openai-demo-purviewdatasecurity',
] as const;

export const MIASMA_C2_DOMAINS = [
  'check.git-service.com',
  't.m-kosche.com',
  'git-service.com',
] as const;

export const MIASMA_ATTACK_START_DATE = '2026-06-02';

export const MIASMA_SOURCE_URL =
  'https://www.stepsecurity.io/blog/miasma-worm-hits-microsoft-again-azure-functions-action-and-72-other-repositories-disabled-after-supply-chain-attack-targeting-ai-coding-agents';
