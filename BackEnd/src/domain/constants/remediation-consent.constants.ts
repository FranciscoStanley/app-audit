import { LEGAL_POLICY_VERSION } from './legal-policy.constants';

export const REMEDIATION_CONSENT_POLICY_VERSION = LEGAL_POLICY_VERSION;

export const REMEDIATION_ACTIONS = [
  {
    action: 'clone_repository',
    title: 'Clonagem temporária',
    description:
      'Cópia local do repositório em workspace seguro para aplicar alterações. O workspace é excluído após a operação.',
  },
  {
    action: 'modify_files',
    title: 'Alteração de arquivos',
    description:
      'Atualização de manifestos de dependências, .gitignore, workflows GitHub Actions e arquivos de configuração relacionados à vulnerabilidade.',
  },
  {
    action: 'regenerate_lockfiles',
    title: 'Regeneração de lockfiles',
    description:
      'Execução de npm, pnpm ou yarn para atualizar lockfiles após correção de dependências.',
  },
  {
    action: 'push_or_pr',
    title: 'Commit, push ou Pull Request',
    description:
      'Envio de alterações ao repositório remoto via commit direto (branch permitido) ou abertura de Pull Request quando o branch padrão é protegido.',
  },
  {
    action: 'github_api',
    title: 'Ações via API GitHub',
    description:
      'Habilitação de Dependabot, criação de issues de segurança e demais ações corretivas disponíveis via GitHub API ou gh CLI.',
  },
] as const;

export const REMEDIATION_RISKS = [
  'Alterações automatizadas podem exigir revisão humana antes do merge em produção',
  'Correções de dependências podem introduzir incompatibilidades em builds existentes',
  'Pull Requests abertos permanecem no GitHub até aprovação ou fechamento por você ou sua equipe',
  'Operações dependem de permissões efetivas do token OAuth ou GITHUB_TOKEN configurado no servidor',
] as const;

export const REMEDIATION_LEGAL_BASIS =
  'Consentimento específico e informado do titular (LGPD art. 7º, I) para alterações em repositórios GitHub solicitadas explicitamente por você.';
