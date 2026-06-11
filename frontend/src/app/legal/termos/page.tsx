import Link from 'next/link';

export const metadata = {
  title: 'Termo de Uso — App Audit',
};

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-slate-300">
      <Link href="/login" className="text-sm text-violet-400 hover:underline">
        ← Voltar ao login
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-white">Termo de Uso</h1>
      <p className="mt-2 text-sm text-slate-500">Última atualização: junho de 2026 · Versão 1.0.0</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Aceitação</h2>
          <p>
            Ao utilizar o App Audit, você concorda com este Termo e com a Política de Privacidade. O login
            via GitHub exige consentimento específico e informado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Serviço</h2>
          <p>
            Plataforma de auditoria de segurança para repositórios GitHub, incluindo análise de
            vulnerabilidades, relatórios e recomendações de remediação.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Conta e responsabilidades</h2>
          <p>
            Você é responsável por manter credenciais seguras e por garantir que possui autorização para
            auditar os repositórios conectados.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Integração GitHub</h2>
          <p>
            O acesso via OAuth concede permissões de leitura conforme descrito no fluxo de consentimento.
            Você pode revogar a qualquer momento desconectando o GitHub nas configurações.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Limitação de responsabilidade</h2>
          <p>
            O serviço é fornecido &quot;como está&quot;. Relatórios são informativos e não substituem
            avaliação profissional de segurança quando exigida por regulamentação específica.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">6. Alterações</h2>
          <p>
            Podemos atualizar este Termo. Mudanças materiais exigirão novo consentimento para OAuth GitHub.
          </p>
        </section>
      </div>
    </div>
  );
}
