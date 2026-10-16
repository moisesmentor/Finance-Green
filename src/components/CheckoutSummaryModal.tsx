import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Calendar,
  RefreshCw,
  ArrowRight,
  X,
  Lock,
  Sparkles,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { PlanTier, ThemeMode, UserProfile, UserSubscription } from '../types';
import { PLAN_DETAILS, getEffectivePlan } from '../utils/permissions';

interface CheckoutSummaryModalProps {
  isOpen: boolean;
  selectedPlan: Exclude<PlanTier, 'free'> | null;
  user: UserProfile | null;
  subscription?: UserSubscription | null;
  theme: ThemeMode;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onProceedToPayment: (plan: Exclude<PlanTier, 'free'>) => void;
  onGoToApp: () => void;
}

const PLAN_HIGHLIGHTS: Record<Exclude<PlanTier, 'free'>, string[]> = {
  basic: [
    'Tudo do plano Grátis liberado',
    'Importação em lote de extratos bancários (.OFX e .CSV)',
    'Categorias personalizadas ilimitadas com ícones e cores',
    'Tetos de gasto mensais por categoria e alertas',
    'Backup e restauração completa em arquivo JSON',
  ],
  pro: [
    'Tudo dos planos Grátis e Basic liberado',
    'Reserva de Emergência e Cofrinhos de Metas financeiras',
    'Módulo Patrimônio (Investimentos, Previdência, Consórcio)',
    'Relatório consolidado de Visão Anual mês a mês',
    'Acesso prioritário aos recursos futuros (Open Finance e WhatsApp)',
  ],
};

export const CheckoutSummaryModal: React.FC<CheckoutSummaryModalProps> = ({
  isOpen,
  selectedPlan,
  user,
  subscription,
  theme,
  isSubmitting = false,
  errorMessage = null,
  onClose,
  onProceedToPayment,
  onGoToApp,
}) => {
  if (!isOpen || !selectedPlan) return null;

  const planInfo = PLAN_DETAILS[selectedPlan];
  const effectivePlan = getEffectivePlan(subscription, user?.email);
  const isSamePlanActive = effectivePlan === selectedPlan;
  const isUpgradeFromBasic = effectivePlan === 'basic' && selectedPlan === 'pro';
  const isDowngradeFromPro = effectivePlan === 'pro' && selectedPlan === 'basic';

  return (
    <div
      className={theme === 'dark' ? 'dark' : ''}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-summary-title"
    >
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden my-auto">
          {/* Top Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#059669] via-emerald-500 to-teal-400" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-0.5 text-xs font-bold text-[#059669] dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                Resumo da Assinatura
              </span>
              <h2
                id="checkout-summary-title"
                className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white"
              >
                Green Finance {planInfo.name}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                Confira os detalhes do seu plano antes de seguir para o ambiente seguro de pagamento.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar resumo"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Conta autenticada */}
            {user && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-[#18181c] px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#059669] dark:text-emerald-400 shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Assinatura vinculada à conta:
                    </span>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">
                      {user.displayName ? `${user.displayName} (${user.email})` : user.email}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Caso já tenha o mesmo plano ativo */}
            {isSamePlanActive && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-sm text-slate-800 dark:text-slate-100">
                  <p className="font-bold">Você já possui o plano {planInfo.name} ativo!</p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    Todos os recursos deste plano já estão liberados na sua conta.
                  </p>
                </div>
              </div>
            )}

            {/* Aviso de Upgrade ou Downgrade (Etapa 5) */}
            {(isUpgradeFromBasic || isDowngradeFromPro) && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-slate-800 dark:text-slate-100">
                  <p className="font-bold">
                    {isUpgradeFromBasic
                      ? 'Mudança de plano: Basic → Pro (Upgrade)'
                      : 'Mudança de plano: Pro → Basic (Downgrade)'}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {isUpgradeFromBasic
                      ? 'Sua assinatura atual será atualizada para o plano Pro (R$ 29,90/mês) sem cobrança duplicada.'
                      : 'Sua assinatura passará para o plano Basic (R$ 19,90/mês) a partir do próximo ciclo de cobrança.'}
                  </p>
                </div>
              </div>
            )}

            {/* Card Principal de Preço e Renovação */}
            <div className="rounded-2xl border-2 border-[#059669]/40 bg-emerald-500/[0.04] dark:bg-[#141c19] p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#059669] dark:text-emerald-400">
                    Plano Escolhido
                  </span>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Plano {planInfo.name}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {planInfo.priceFormatted}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {planInfo.cycleLabel}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <Calendar className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0" />
                  <span>
                    <strong>Ciclo:</strong> Renovação mensal
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <CreditCard className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0" />
                  <span>
                    <strong>Pagamento:</strong> Cartão, Pix ou Boleto
                  </span>
                </div>
              </div>
            </div>

            {/* Recursos incluídos */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                O que será liberado na sua conta:
              </div>
              <ul className="space-y-2">
                {PLAN_HIGHLIGHTS[selectedPlan].map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Política de Cancelamento e Garantia de 7 Dias */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-[#18181c] p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  <strong>Garantia incondicional de 7 dias:</strong> conforme o art. 49 do CDC, você pode solicitar o reembolso integral em até 7 dias corridos após o primeiro pagamento.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <RefreshCw className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  <strong>Cancelamento livre a qualquer momento:</strong> sem fidelidade e sem multa. Ao cancelar no app, nenhuma nova cobrança é gerada e seu acesso permanece ativo até o fim do período já pago.
                </p>
              </div>
            </div>

            {/* Mensagem de erro se houver */}
            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-rose-600 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Botões de Ação (fonte >= 16px no mobile: text-base) */}
            <div className="pt-1 flex flex-col gap-2.5">
              {isSamePlanActive ? (
                <button
                  type="button"
                  onClick={onGoToApp}
                  className="w-full py-3.5 px-6 rounded-xl text-base font-bold text-white bg-[#059669] hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Ir para o aplicativo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onProceedToPayment(selectedPlan)}
                  className="w-full py-3.5 px-6 rounded-xl text-base font-bold text-white bg-[#059669] hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Preparando checkout seguro...</span>
                    </>
                  ) : (
                    <>
                      <span>Ir para o pagamento</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Voltar aos planos
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 text-center">
              <Lock className="w-3.5 h-3.5 text-[#059669] dark:text-emerald-400 shrink-0" />
              <span>Pagamento processado no ambiente criptografado do Asaas. Não armazenamos dados de cartão.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
