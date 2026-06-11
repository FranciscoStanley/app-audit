export const GITHUB_OAUTH_POLICY_VERSION = '1.0.0';

export const GITHUB_OAUTH_SCOPES = [
  {
    scope: 'read:user',
    title: 'Perfil do usuário',
    description:
      'Acesso de leitura ao seu nome de usuário, nome público e avatar no GitHub para identificação na plataforma.',
  },
  {
    scope: 'user:email',
    title: 'E-mail',
    description:
      'Acesso ao seu endereço de e-mail principal no GitHub para criação da conta e comunicações essenciais do serviço.',
  },
  {
    scope: 'repo',
    title: 'Repositórios',
    description:
      'Acesso de leitura aos seus repositórios públicos e privados para executar varreduras de segurança (código, workflows, dependências). Não realizamos alterações nos repositórios sem ação explícita de remediação autorizada por você.',
  },
] as const;

export const DATA_PROCESSING_PURPOSES = [
  'Autenticação e gestão de sessão na plataforma App Audit',
  'Execução de auditorias de segurança nos repositórios GitHub autorizados',
  'Geração de relatórios de vulnerabilidades e recomendações de remediação',
  'Cumprimento de obrigações legais e exercício regular de direitos',
] as const;

export const DATA_SUBJECT_RIGHTS = [
  'Confirmação da existência de tratamento e acesso aos dados (LGPD art. 18)',
  'Correção de dados incompletos, inexatos ou desatualizados',
  'Anonimização, bloqueio ou eliminação de dados desnecessários',
  'Portabilidade dos dados a outro fornecedor, quando aplicável',
  'Revogação do consentimento a qualquer momento (desconectar GitHub)',
  'Informação sobre compartilhamento e sobre a possibilidade de não consentir',
] as const;
