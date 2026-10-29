import React from 'react';
import { Wallet, ArrowLeft, AlertTriangle, ShieldCheck, FileText, Trash2, Sun, Moon } from 'lucide-react';
import { ThemeMode } from '../types';

export type LegalPageType = 'termos' | 'privacidade' | 'excluir-conta';

interface LegalPagesProps {
  page: LegalPageType;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onBack: () => void;
  onNavigatePage: (page: LegalPageType) => void;
  onNavigateAuth: (mode: 'login' | 'register') => void;
}

export const LegalPages: React.FC<LegalPagesProps> = ({
  page,
  theme,
  onToggleTheme,
  onBack,
  onNavigatePage,
  onNavigateAuth,
}) => {
  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#060606] text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col">
      
      {/* Top Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 dark:bg-[#060606]/85 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="max-w-4xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#059669] dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para o início</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
            <button
              type="button"
              onClick={() => onNavigateAuth('login')}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#059669] hover:bg-emerald-500 transition-all cursor-pointer"
            >
              Entrar no App
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        
        {/* Legal Tabs Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigatePage('termos')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              page === 'termos'
                ? 'bg-[#059669] text-white shadow-sm'
                : 'bg-white dark:bg-[#121215] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Termos de Uso</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigatePage('privacidade')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              page === 'privacidade'
                ? 'bg-[#059669] text-white shadow-sm'
                : 'bg-white dark:bg-[#121215] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/10'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Política de Privacidade</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigatePage('excluir-conta')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              page === 'excluir-conta'
                ? 'bg-[#059669] text-white shadow-sm'
                : 'bg-white dark:bg-[#121215] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/10'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir Conta e Dados</span>
          </button>
        </div>

        {/* Notice Banner for Legal Professional Review */}
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs sm:text-sm leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block text-slate-900 dark:text-white">
              Modelo Inicial para Revisão Jurídica
            </strong>
            Este documento é um modelo estrutural alinhado ao funcionamento técnico real do Green Finance Pro e à LGPD (Lei nº 13.709/2018). Recomendamos a revisão por um advogado ou especialista jurídico antes da divulgação societária definitiva.
          </div>
        </div>

        {/* =================================================================== */}
        {/* 1. TERMOS DE USO                                                    */}
        {/* =================================================================== */}
        {page === 'termos' && (
          <article className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215] p-6 sm:p-10 space-y-6 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
            <div className="border-b border-slate-200/80 dark:border-white/10 pb-5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Termos de Uso — Green Finance Pro
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Última atualização: Outubro de 2026
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Objeto do Serviço</h2>
              <p>
                O <strong>Green Finance Pro</strong> (acessível em <code>greenfinancepro.com.br</code>) é uma plataforma web de organização financeira pessoal e familiar. O aplicativo permite o registro manual e a importação de arquivos de extrato (OFX/CSV) para acompanhamento de receitas, despesas, orçamentos por categoria, reserva de emergência, metas e consolidação de patrimônio.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Natureza Informativa (Não Consultoria)</h2>
              <p>
                O Green Finance Pro é uma ferramenta tecnológica de organização e visualização de dados inseridos pelo próprio usuário. O aplicativo <strong>não presta consultoria financeira, contábil, jurídica ou recomendação de investimentos</strong>, nem realiza movimentações bancárias em nome do usuário.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Cadastro, Conta e Segurança</h2>
              <p>
                Para utilizar o aplicativo, o usuário cria uma conta protegida por e-mail e senha através do sistema Google Firebase Authentication. O usuário é responsável por manter a confidencialidade de sua senha. O Green Finance Pro nunca solicita senhas de aplicativos bancários ou tokens de transação.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Planos, Assinaturas e Cancelamento</h2>
              <p>
                O serviço oferece modalidades Grátis, Basic e Pro, conforme descritas na seção de Planos da página inicial:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Cancelamento livre:</strong> o usuário pode cancelar sua assinatura paga a qualquer momento, sem multa ou fidelidade, interrompendo cobranças dos ciclos seguintes.
                </li>
                <li>
                  <strong>Direito de arrependimento (CDC, art. 49):</strong> em até 7 (sete) dias corridos após a contratação inicial de um plano pago, o usuário pode solicitar o cancelamento com reembolso integral do valor pago.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Disponibilidade e Backup</h2>
              <p>
                Buscamos manter o serviço acessível continuamente, utilizando infraestrutura em nuvem (Vercel e Google Firebase). O usuário dispõe, dentro do próprio aplicativo, da ferramenta de exportação de backup completo em formato <code>.JSON</code> para guardar cópia local de seus dados sempre que desejar.
              </p>
            </section>
          </article>
        )}

        {/* =================================================================== */}
        {/* 2. POLÍTICA DE PRIVACIDADE (LGPD)                                   */}
        {/* =================================================================== */}
        {page === 'privacidade' && (
          <article className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215] p-6 sm:p-10 space-y-6 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
            <div className="border-b border-slate-200/80 dark:border-white/10 pb-5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Política de Privacidade e Proteção de Dados (LGPD)
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
              </p>
            </div>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Quais Dados Coletamos</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Dados de identificação da conta:</strong> nome de exibição, endereço de e-mail e identificador único de autenticação (UID).
                </li>
                <li>
                  <strong>Dados financeiros registrados pelo usuário:</strong> lançamentos de receitas e despesas, categorias personalizadas, tetos de orçamento, metas, registros de patrimônio e saldos manuais de contas.
                </li>
                <li>
                  <strong>Preferências técnicas locais:</strong> escolha de tema visual (claro ou escuro) armazenada no navegador (<code>localStorage</code>), sem utilização de cookies de rastreamento publicitário.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Como Armazenamos e Isolamos seus Dados</h2>
              <p>
                Todos os registros são armazenados no banco de dados <strong>Google Cloud Firestore</strong> com criptografia em trânsito (HTTPS/TLS) e em repouso. As regras de segurança do banco de dados exigem que <code>request.auth.uid == userId</code>, garantindo que cada usuário acesse exclusivamente suas próprias subcoleções (<code>/users/&#123;uid&#125;/...</code>).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Não Comercialização de Dados</h2>
              <p>
                O Green Finance Pro <strong>não vende, não aluga e não compartilha</strong> seus dados pessoais ou financeiros com anunciantes, corretoras ou terceiros para fins comerciais. Utilizamos apenas operadores essenciais de infraestrutura (Google Firebase para banco de dados/autenticação e Vercel para hospedagem da aplicação).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Direitos do Titular (Art. 18 da LGPD)</h2>
              <p>
                Você pode, a qualquer momento: visualizar, corrigir, exportar integralmente seus dados em formato estruturado (JSON) ou excluir todas as suas transações e sua conta diretamente pela plataforma.
              </p>
            </section>
          </article>
        )}

        {/* =================================================================== */}
        {/* 3. EXCLUIR CONTA E DADOS                                            */}
        {/* =================================================================== */}
        {page === 'excluir-conta' && (
          <article className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215] p-6 sm:p-10 space-y-6 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
            <div className="border-b border-slate-200/80 dark:border-white/10 pb-5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Exclusão de Conta e Dados Pessoais
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Controle total sobre a permanência das suas informações no Green Finance Pro
              </p>
            </div>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Como limpar ou excluir seus dados passo a passo
              </h2>
              <ol className="list-decimal pl-5 space-y-2.5">
                <li>
                  <strong>Exporte um backup antes (Opcional):</strong> acesse sua conta no Green Finance Pro, abra o menu <em>Backup JSON</em> no rodapé ou menu do usuário e baixe uma cópia completa dos seus lançamentos, metas e patrimônio.
                </li>
                <li>
                  <strong>Limpeza imediata dos lançamentos pelo App:</strong> dentro do modal <em>Backup JSON</em>, você pode acionar a opção de limpar todas as transações armazenadas na nuvem e no cache local do navegador.
                </li>
                <li>
                  <strong>Encerramento definitivo da credencial de acesso:</strong> ao solicitar a exclusão da conta, a credencial no Firebase Authentication e todas as subcoleções associadas ao seu <code>UID</code> (<code>transactions</code>, <code>budgets</code>, <code>goals</code>, <code>investments</code>, <code>custom_categories</code> e <code>bank_accounts</code>) são removidas em definitivo.
                </li>
              </ol>
            </section>

            <section className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-[#18181c] p-5 space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Deseja acessar sua conta agora para gerenciar ou remover seus dados?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Faça login na sua conta para acessar a área de Backup e Exclusão de Dados em tempo real.
              </p>
              <button
                type="button"
                onClick={() => onNavigateAuth('login')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#059669] hover:bg-emerald-500 transition-all cursor-pointer"
              >
                <span>Acessar minha conta</span>
              </button>
            </section>
          </article>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-white/[0.08] py-6 bg-white dark:bg-[#060606] text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Wallet className="w-4 h-4 text-[#059669]" />
            <span>Green Finance Pro</span>
          </div>
          <span>© {new Date().getFullYear()} Green Finance Pro • Todos os direitos reservados</span>
        </div>
      </footer>
    </div>
  );
};
