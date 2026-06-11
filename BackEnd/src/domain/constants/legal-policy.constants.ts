/** Versão unificada de Termos, Privacidade e fluxos de consentimento. */
export const LEGAL_POLICY_VERSION = '1.1.0';

export const LEGAL_THIRD_PARTIES = [
  {
    name: 'GitHub, Inc.',
    purpose:
      'Autenticação OAuth, acesso à API de repositórios, GitHub CLI (gh), GitHub Advisory Database e alertas Dependabot.',
    location: 'Estados Unidos',
  },
  {
    name: 'OpenSourceMalware (OSM)',
    purpose:
      'Consulta de indicadores de malware em pacotes e repositórios durante varreduras de segurança (identificadores de pacote, versão e URL de repositório).',
    location: 'Estados Unidos / União Europeia (conforme operação do serviço)',
  },
] as const;

export const LEGAL_DATA_CATEGORIES = [
  'Identificação e contato: nome, e-mail, usuário GitHub, avatar e identificador GitHub',
  'Credenciais: senha (hash irreversível) para login por e-mail; tokens OAuth GitHub cifrados (AES-256-GCM)',
  'Sessão: token JWT emitido pela plataforma; preferências de sessão no navegador (localStorage)',
  'Consentimento: registros de aceite (versão da política, escopos, IP, user-agent, data/hora)',
  'Auditoria: metadados de repositórios, achados de segurança, evidências técnicas (trechos de código, caminhos de arquivo, dependências)',
  'Relatórios: arquivos JSON, Markdown e PDF gerados e armazenados localmente',
  'Remediação: cópias temporárias de repositórios em workspace local durante correções automatizadas',
  'Operação: papel RBAC (admin, auditor, viewer), logs de acesso e rate limiting',
] as const;

export const LEGAL_RETENTION_PERIODS = [
  'Conta e tokens OAuth: enquanto a conta estiver ativa ou até revogação/desconexão do GitHub',
  'Relatórios de auditoria: enquanto a conta estiver ativa ou até exclusão solicitada pelo titular',
  'Registros de consentimento: 5 anos após revogação ou encerramento da conta (obrigações legais e defesa de direitos)',
  'Workspace de remediação: excluído após conclusão da operação (retenção temporária)',
] as const;

export const LEGAL_INTERNATIONAL_TRANSFER =
  'Alguns operadores (como GitHub e OpenSourceMalware) processam dados fora do Brasil. Adotamos cláusulas contratuais, medidas técnicas e organizacionais compatíveis com a LGPD para proteger os dados transferidos internacionalmente.';

/** Fallback quando PRIVACY_CONTACT_EMAIL não está definido no ambiente. */
export const DEFAULT_PRIVACY_CONTACT_EMAIL = 'franciscothestanley@gmail.com';

export const DATA_SUBJECT_RIGHTS = [
  'Confirmação da existência de tratamento e acesso aos dados (LGPD art. 18, I e II)',
  'Correção de dados incompletos, inexatos ou desatualizados (art. 18, III)',
  'Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos (art. 18, IV)',
  'Portabilidade dos dados a outro fornecedor, quando aplicável (art. 18, V)',
  'Eliminação dos dados tratados com consentimento, salvo hipóteses legais (art. 18, VI)',
  'Informação sobre compartilhamento e sobre a possibilidade de não consentir (art. 18, VII e VIII)',
  'Revogação do consentimento a qualquer momento (art. 18, IX)',
  'Oposição a tratamento irregular e petição à ANPD (art. 18, § 1º)',
] as const;
