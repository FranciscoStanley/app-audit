import Link from 'next/link';
import { LegalList, LegalPageShell, LegalSection } from '@/components/legal/legal-page-shell';

export const metadata = {
  title: 'Política de Privacidade — App Audit',
};

export default function PrivacidadePage() {
  return (
    <LegalPageShell title="Política de Privacidade">
      <LegalSection title="1. Introdução">
        <p>
          Esta Política de Privacidade descreve como o <strong className="text-white">App Audit</strong> trata dados
          pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), o Marco Civil da
          Internet e boas práticas internacionais de privacidade e segurança da informação.
        </p>
        <p>
          Esta Política complementa o{' '}
          <Link href="/legal/termos" className="text-violet-400 hover:underline">
            Termo de Uso
          </Link>{' '}
          e deve ser lida em conjunto com os fluxos de consentimento apresentados no login GitHub, no login por
          e-mail e antes da remediação automática.
        </p>
      </LegalSection>

      <LegalSection title="2. Controlador e contato">
        <p>
          O controlador dos dados pessoais é a entidade identificada como{' '}
          <strong className="text-white">App Audit</strong>, responsável pelas decisões referentes ao tratamento de
          dados pessoais.
        </p>
        <p>
          Canal do titular e privacidade:{' '}
          <a href="mailto:franciscothestanley@gmail.com" className="text-violet-400 hover:underline">
            franciscothestanley@gmail.com
          </a>
        </p>
        <p>
          Encarregado de dados (DPO):{' '}
          <a href="mailto:franciscothestanley@gmail.com" className="text-violet-400 hover:underline">
            franciscothestanley@gmail.com
          </a>
        </p>
        <LegalList
          items={[
            'Endereço do controlador: informado mediante solicitação ao canal acima, quando exigido por lei',
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Dados pessoais tratados">
        <LegalList
          items={[
            'Identificação e contato: nome, e-mail, usuário GitHub, avatar e identificador GitHub',
            'Credenciais: senha (hash irreversível) para login por e-mail; tokens OAuth GitHub cifrados (AES-256-GCM)',
            'Sessão: token JWT emitido pela plataforma; dados de sessão no navegador (localStorage)',
            'Consentimento: registros de aceite (versão da política, escopos, IP, user-agent, data/hora)',
            'Auditoria: metadados de repositórios, achados de segurança e evidências técnicas (trechos de código, caminhos de arquivo, dependências, workflows)',
            'Relatórios: arquivos JSON, Markdown e PDF gerados e armazenados localmente no servidor',
            'Remediação: cópias temporárias de repositórios em workspace local durante correções automatizadas',
            'Operação: papel RBAC (admin, auditor, viewer), logs de acesso e rate limiting',
          ]}
        />
        <p>
          Não vendemos dados pessoais. Não utilizamos dados para publicidade comportamental ou perfilamento comercial
          de terceiros.
        </p>
      </LegalSection>

      <LegalSection title="4. Finalidades e bases legais">
        <p>Tratamos dados pessoais para as seguintes finalidades:</p>
        <LegalList
          items={[
            'Autenticação e gestão de sessão — execução de contrato (art. 7º, V) e consentimento quando aplicável',
            'Auditoria de segurança em repositórios GitHub — consentimento (art. 7º, I) no login OAuth',
            'Consulta a threat intelligence (GitHub Advisories, OpenSourceMalware) — legítimo interesse em segurança da informação e consentimento correlato',
            'Geração de relatórios (MD/PDF) — execução de contrato',
            'Remediação automatizada — consentimento específico e informado (art. 7º, I)',
            'Registros de consentimento e logs de segurança — cumprimento de obrigação legal e legítimo interesse (art. 7º, II e IX)',
            'Exercício regular de direitos — art. 7º, VI',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Compartilhamento e operadores">
        <p>Compartilhamos ou processamos dados com os seguintes terceiros, estritamente para as finalidades descritas:</p>
        <LegalList
          items={[
            'GitHub, Inc. — autenticação OAuth, API de repositórios, GitHub CLI (gh), GitHub Advisory Database, alertas Dependabot (EUA)',
            'OpenSourceMalware (OSM) — consulta de indicadores de malware em pacotes e repositórios durante varreduras (identificadores de pacote, versão e URL)',
          ]}
        />
        <p>
          Alguns operadores processam dados fora do Brasil. Adotamos medidas técnicas e organizacionais compatíveis com
          a LGPD para proteger dados transferidos internacionalmente, incluindo cláusulas contratuais e controles de
          acesso.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies e tecnologias similares">
        <p>
          Utilizamos token JWT armazenado localmente no navegador (localStorage) para manter sua sessão autenticada.
          Não utilizamos cookies de rastreamento de terceiros para publicidade. Você pode encerrar a sessão pelo
          logout, o que remove o token local.
        </p>
      </LegalSection>

      <LegalSection title="7. Retenção">
        <LegalList
          items={[
            'Conta e tokens OAuth: enquanto a conta estiver ativa ou até revogação/desconexão do GitHub',
            'Relatórios de auditoria: enquanto a conta estiver ativa ou até exclusão solicitada pelo titular',
            'Registros de consentimento: 5 anos após revogação ou encerramento da conta (obrigações legais e defesa de direitos)',
            'Workspace de remediação: excluído após conclusão da operação (retenção temporária)',
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Segurança">
        <LegalList
          items={[
            'Tokens OAuth cifrados (AES-256-GCM) com segredo derivado de JWT_SECRET',
            'Comunicação via HTTPS em produção',
            'Controle de acesso RBAC (admin, auditor, viewer)',
            'Rate limiting em endpoints sensíveis (login, OAuth, consentimento)',
            'Auditoria de consentimentos com IP e user-agent quando disponíveis',
            'Armazenamento local em volume dedicado (Docker) ou diretório data/ isolado',
          ]}
        />
        <p>
          Nenhum sistema é 100% seguro. Em caso de incidente com impacto a dados pessoais, notificaremos titulares e
          a ANPD conforme exigido pela legislação aplicável.
        </p>
      </LegalSection>

      <LegalSection title="9. Direitos do titular (LGPD art. 18)">
        <p>Você pode exercer, mediante requisição ao canal de privacidade:</p>
        <LegalList
          items={[
            'Confirmação da existência de tratamento e acesso aos dados',
            'Correção de dados incompletos, inexatos ou desatualizados',
            'Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos',
            'Portabilidade dos dados a outro fornecedor, quando aplicável',
            'Eliminação dos dados tratados com consentimento, salvo hipóteses legais',
            'Informação sobre compartilhamento e sobre a possibilidade de não consentir',
            'Revogação do consentimento (ex.: desconectar GitHub; recusar remediação)',
            'Oposição a tratamento em desconformidade e petição à Autoridade Nacional de Proteção de Dados (ANPD)',
          ]}
        />
        <p>
          Responderemos solicitações em prazo razoável, conforme art. 18, § 3º da LGPD, podendo solicitar informações
          adicionais para confirmar sua identidade.
        </p>
      </LegalSection>

      <LegalSection title="10. Crianças e adolescentes">
        <p>
          A Plataforma não se destina a menores de 18 anos. Se tomarmos conhecimento de tratamento inadvertido de dados
          de menores, adotaremos medidas para eliminação ou anonimização conforme aplicável.
        </p>
      </LegalSection>

      <LegalSection title="11. Alterações desta Política">
        <p>
          Podemos atualizar esta Política periodicamente. A versão vigente é indicada no topo desta página. Alterações
          materiais podem exigir novo consentimento nos fluxos OAuth, login ou remediação.
        </p>
      </LegalSection>

      <LegalSection title="12. Disposições finais">
        <p>
          Em caso de conflito entre esta Política e acordos específicos firmados com sua organização (DPA, contrato
          empresarial), prevalecerão os termos do acordo específico naquilo que for mais protetivo ao titular ou
          exigido por lei.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
