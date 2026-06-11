import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade — App Audit',
};

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-slate-300">
      <Link href="/login" className="text-sm text-violet-400 hover:underline">
        ← Voltar ao login
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-white">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-slate-500">Última atualização: junho de 2026 · Versão 1.0.0</p>

      <div className="prose prose-invert mt-8 max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Introdução</h2>
          <p>
            Esta Política descreve como o App Audit trata dados pessoais em conformidade com a Lei Geral de
            Proteção de Dados (LGPD — Lei 13.709/2018) e boas práticas internacionais de privacidade.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Dados coletados</h2>
          <ul className="list-inside list-disc space-y-1">
            <li>Identificação: nome, e-mail, usuário GitHub</li>
            <li>Autenticação: tokens OAuth cifrados, logs de consentimento</li>
            <li>Auditoria: metadados e achados de segurança dos repositórios autorizados</li>
            <li>Técnicos: IP e user-agent no momento do consentimento (quando aplicável)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Finalidades</h2>
          <p>
            Prestação do serviço de auditoria de segurança, autenticação, geração de relatórios,
            cumprimento legal e exercício de direitos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Base legal</h2>
          <p>
            Consentimento do titular para login GitHub e tratamentos correlatos; execução de contrato para
            usuários cadastrados por e-mail.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Compartilhamento</h2>
          <p>
            Dados podem ser processados pelo GitHub, Inc. para autenticação OAuth. Não vendemos dados
            pessoais.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">6. Retenção</h2>
          <p>
            Mantidos enquanto a conta estiver ativa ou conforme obrigação legal. Tokens revogados ao
            desconectar o GitHub.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">7. Direitos do titular</h2>
          <p>
            Acesso, correção, eliminação, portabilidade, revogação do consentimento e informação sobre
            tratamento — art. 18 da LGPD. Contato: privacidade@exemplo.com
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">8. Segurança</h2>
          <p>
            Tokens cifrados, HTTPS, controle de acesso RBAC, rate limiting e auditoria de consentimentos.
          </p>
        </section>
      </div>
    </div>
  );
}
