import {
  DATA_SUBJECT_RIGHTS,
  LEGAL_POLICY_VERSION,
  LEGAL_RETENTION_PERIODS,
  LEGAL_THIRD_PARTIES,
} from './legal-policy.constants';

export const GITHUB_OAUTH_POLICY_VERSION = LEGAL_POLICY_VERSION;

export const GITHUB_OAUTH_SCOPES = [
  {
    scope: 'read:user',
    title: 'Perfil do usuário',
    description:
      'Leitura do seu nome de usuário, nome público e avatar no GitHub para identificação e personalização da conta na plataforma.',
  },
  {
    scope: 'user:email',
    title: 'Endereço de e-mail',
    description:
      'Leitura do seu e-mail principal verificado no GitHub para criação da conta, autenticação e comunicações essenciais sobre o serviço.',
  },
  {
    scope: 'repo',
    title: 'Repositórios (leitura e escrita técnica)',
    description:
      'Acesso aos seus repositórios públicos e privados para varreduras de segurança (código-fonte, workflows, manifestos e dependências). O escopo técnico do GitHub inclui permissão de escrita; utilizamos leitura por padrão e escrita somente quando você solicitar remediação automática (commits, branches, pull requests ou configurações de segurança).',
  },
] as const;

export const DATA_PROCESSING_PURPOSES = [
  'Autenticação e gestão de sessão na plataforma App Audit',
  'Listagem e análise de repositórios GitHub autorizados por você',
  'Execução de auditorias de segurança (malware, supply chain, secrets, CI/CD, dependências)',
  'Consulta a bases de threat intelligence (GitHub Advisories, OpenSourceMalware)',
  'Geração de relatórios em Markdown e PDF',
  'Remediação automatizada de vulnerabilidades, quando expressamente autorizada por você',
  'Cumprimento de obrigações legais e exercício regular de direitos',
] as const;

export { DATA_SUBJECT_RIGHTS };

export const GITHUB_OAUTH_RETENTION_SUMMARY =
  LEGAL_RETENTION_PERIODS.slice(0, 2).join('. ') +
  '. Tokens OAuth são revogados ao desconectar o GitHub.';

export const GITHUB_OAUTH_THIRD_PARTIES = LEGAL_THIRD_PARTIES.map(({ name, purpose }) => ({
  name,
  purpose,
}));
