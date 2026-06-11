import Link from 'next/link';
import { LegalList, LegalPageShell, LegalSection } from '@/components/legal/legal-page-shell';

export const metadata = {
  title: 'Termo de Uso — App Audit',
};

export default function TermosPage() {
  return (
    <LegalPageShell title="Termo de Uso">
      <LegalSection title="1. Partes e aceitação">
        <p>
          Este Termo de Uso (&quot;Termo&quot;) regula o acesso e a utilização da plataforma{' '}
          <strong className="text-white">App Audit</strong> (&quot;Plataforma&quot;), solução de auditoria de
          segurança para repositórios GitHub. Ao criar conta, autenticar-se ou utilizar qualquer funcionalidade,
          você declara ter lido, compreendido e concordado com este Termo e com a{' '}
          <Link href="/legal/privacidade" className="text-violet-400 hover:underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <p>
          O login via GitHub exige consentimento específico e informado, conforme a Lei Geral de Proteção de Dados
          (LGPD — Lei nº 13.709/2018). A remediação automática exige consentimento adicional antes de qualquer
          alteração em repositórios.
        </p>
      </LegalSection>

      <LegalSection title="2. Descrição do serviço">
        <p>A Plataforma oferece, entre outras funcionalidades:</p>
        <LegalList
          items={[
            'Autenticação por e-mail/senha ou GitHub OAuth, com controle de acesso baseado em papéis (RBAC)',
            'Varreduras de segurança em repositórios GitHub autorizados (públicos e privados)',
            'Detecção de malware (Miasma), supply chain, secrets expostos, CI/CD inseguro e dependências vulneráveis',
            'Consulta a bases de threat intelligence (GitHub Advisory Database e OpenSourceMalware)',
            'Geração de relatórios consolidados e por vulnerabilidade (Markdown e PDF)',
            'Remediação automatizada opcional (alteração de manifestos, lockfiles, workflows, PRs e ações via API GitHub)',
          ]}
        />
        <p>
          Os relatórios são informativos e não substituem avaliação profissional de segurança, pentest ou certificação
          exigida por regulamentação específica do seu setor.
        </p>
      </LegalSection>

      <LegalSection title="3. Elegibilidade e conta">
        <LegalList
          items={[
            'Você deve ter capacidade legal para contratar e, quando aplicável, autorização da organização titular dos repositórios auditados',
            'Contas por e-mail são provisionadas pela administração da organização; credenciais são pessoais e intransferíveis',
            'Você é responsável por manter senhas seguras e por toda atividade realizada em sua conta',
            'Notifique imediatamente o administrador ou o contato de privacidade em caso de uso não autorizado',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Integração GitHub e permissões">
        <p>
          Ao conectar o GitHub, você autoriza o App Audit a acessar sua conta conforme os escopos OAuth informados no
          fluxo de consentimento: <code className="text-violet-300">read:user</code>,{' '}
          <code className="text-violet-300">user:email</code> e <code className="text-violet-300">repo</code>.
        </p>
        <p>
          O escopo <code className="text-violet-300">repo</code> é tecnicamente amplo no GitHub. Utilizamos leitura
          para auditorias e escrita <strong className="text-white">somente</strong> quando você solicitar remediação
          automática e tiver aceito o consentimento específico para essa finalidade.
        </p>
        <p>
          Você pode revogar o acesso a qualquer momento desconectando o GitHub nas configurações da Plataforma ou
          revogando o aplicativo OAuth nas configurações do GitHub.
        </p>
      </LegalSection>

      <LegalSection title="5. Remediação automática">
        <p>
          A remediação automatizada é opcional e requer ação explícita sua (por vulnerabilidade ou em lote). Ao
          aceitar o consentimento de remediação, você autoriza o App Audit a:
        </p>
        <LegalList
          items={[
            'Clonar temporariamente repositórios em workspace local seguro',
            'Modificar arquivos relacionados à vulnerabilidade (manifestos, lockfiles, workflows, .gitignore)',
            'Enviar commits, abrir Pull Requests ou executar ações via GitHub API/gh CLI (ex.: Dependabot, issues de segurança)',
          ]}
        />
        <p>
          Você permanece responsável por revisar alterações antes do merge em ambientes de produção. O App Audit não
          garante ausência de regressões em builds ou dependências após correções automatizadas.
        </p>
      </LegalSection>

      <LegalSection title="6. Uso aceitável">
        <LegalList
          items={[
            'Utilizar a Plataforma apenas para fins legítimos de segurança da informação',
            'Auditar somente repositórios sobre os quais você ou sua organização detêm autorização',
            'Não tentar contornar controles de acesso, RBAC ou limites de taxa (rate limiting)',
            'Não utilizar a Plataforma para atividades ilícitas, engenharia reversa maliciosa ou exfiltração indevida de dados',
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Propriedade intelectual">
        <p>
          A Plataforma, sua marca, interface e software são protegidos por direitos de propriedade intelectual. Os
          dados e código-fonte dos seus repositórios permanecem de titularidade sua ou de sua organização. Relatórios
          gerados são disponibilizados para seu uso interno conforme este Termo.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilidade e limitação de responsabilidade">
        <p>
          O serviço é fornecido &quot;como está&quot; e &quot;conforme disponível&quot;, sem garantia de detecção
          exaustiva de todas as vulnerabilidades ou de disponibilidade ininterrupta. Na extensão permitida pela lei
          aplicável, excluímos responsabilidade por danos indiretos, lucros cessantes ou perda de dados decorrentes
          do uso ou da impossibilidade de uso da Plataforma, ressalvadas hipóteses de dolo ou culpa grave.
        </p>
      </LegalSection>

      <LegalSection title="9. Suspensão e encerramento">
        <p>
          Podemos suspender ou encerrar o acesso em caso de violação deste Termo, ordem legal ou risco à segurança.
          Você pode solicitar encerramento de conta e exercer direitos previstos na Política de Privacidade.
        </p>
      </LegalSection>

      <LegalSection title="10. Alterações">
        <p>
          Podemos atualizar este Termo periodicamente. Mudanças materiais serão comunicadas por meio da Plataforma e
          poderão exigir novo consentimento (OAuth GitHub, remediação ou login). A versão vigente é indicada no topo
          desta página.
        </p>
      </LegalSection>

      <LegalSection title="11. Lei aplicável e foro">
        <p>
          Este Termo é regido pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca do
          domicílio do controlador de dados, salvo disposição legal em contrário em relação ao consumidor.
        </p>
      </LegalSection>

      <LegalSection title="12. Contato">
        <p>
          Dúvidas sobre este Termo ou exercício de direitos:{' '}
          <a href="mailto:franciscothestanley@gmail.com" className="text-violet-400 hover:underline">
            franciscothestanley@gmail.com
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
