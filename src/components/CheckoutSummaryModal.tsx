import React, { useState } from 'react';
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
  FileText,
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
  onProceedToPayment: (plan: Exclude<PlanTier, 'free'>, cpfCnpj: string) => void;
  onChangePlan?: (targetPlan: Exclude<PlanTier, 'free'>) => void;
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

function formatCpfCnpjInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function validateCpfCnpjClient(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) {
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits.charAt(i), 10) * (10 - i);
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(digits.charAt(9), 10)) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits.charAt(i), 10) * (11 - i);
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    return rev === parseInt(digits.charAt(10), 10);
  }

  if (digits.length === 14) {
    if (/^(\d)\1{13}$/.test(digits)) return false;
    const calc = (base: string, weights: number[]) => {
      let s = 0;
      for (let i = 0; i < weights.length; i++) s += parseInt(base.charAt(i), 10) * weights[i];
      const rem = s % 11;
      return rem < 2 ? 0 : 11 - rem;
    };
    const d1 = calc(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    if (d1 !== parseInt(digits.charAt(12), 10)) return false;
    const d2 = calc(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return d2 === parseInt(digits.charAt(13), 10);
  }

  return false;
}

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
  onChangePlan,
  onGoToApp,
}) => {
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen || !selectedPlan) return null;

  const planInfo = PLAN_DETAILS[selectedPlan];
  const effectivePlan = getEffectivePlan(subscription, user?.email);
  const isSamePlanActive = effectivePlan === selectedPlan && !subscription?.pendingPlan;
  const isUpgradeFromBasic = effectivePlan === 'basic' && selectedPlan === 'pro';
  const isDowngradeFromPro = effectivePlan === 'pro' && selectedPlan === 'basic';
  const hasActiveAsaasSubscription = Boolean(
    subscription?.asaasSubscriptionId &&
      (subscription.status === 'active' || subscription.status === 'trialing')
  );
  const isExistingSubscriptionChange =
    hasActiveAsaasSubscription && (isUpgradeFromBasic || isDowngradeFromPro) && Boolean(onChangePlan);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (isExistingSubscriptionChange && onChangePlan) {
      onChangePlan(selectedPlan);
      return;
    }

    const digits = cpfCnpj.replace(/\D/g, '');
    if (!validateCpfCnpjClient(digits)) {
      setLocalError('Por favor, informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
      return;
    }

    onProceedToPayment(selectedPlan, digits);
  };

  const activeError = localError || errorMessage;

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
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
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
                      ? 'Mudança de plano: Basic → Pro (Upgrade imediato)'
                      : 'Mudança de plano: Pro → Basic (Aplicada no próximo ciclo)'}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {isUpgradeFromBasic
                      ? 'Os recursos do plano Pro serão liberados agora e sua assinatura mensal passará para R$ 29,90/mês sem cobrança duplicada.'
                      : 'Você continuará com acesso completo ao plano Pro até o fim do período já pago, e a próxima renovação passará para R$ 19,90/mês.'}
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
                    <strong>Formas:</strong> Cartão, Pix ou Boleto
                  </span>
                </div>
              </div>
              <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                Cartão e Pix liberam seu plano em instantes após o pagamento. Boleto bancário leva de 1 a 3 dias úteis para compensação.
              </p>
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

            {/* Campo de CPF / CNPJ exigido pelo Asaas (com fonte >= 16px no mobile) */}
            {!isSamePlanActive && !isExistingSubscriptionChange && (
              <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-[#18181c] p-4 space-y-2">
                <label
                  htmlFor="checkout-cpf-cnpj"
                  className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100"
                >
                  CPF ou CNPJ do titular do pagamento
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    id="checkout-cpf-cnpj"
                    type="text"
                    inputMode="numeric"
                    required
                    value={cpfCnpj}
                    onChange={(e) => {
                      setCpfCnpj(formatCpfCnpjInput(e.target.value));
                      if (localError) setLocalError(null);
                    }}
                    placeholder="000.000.000-00"
                    className="w-full bg-white dark:bg-[#0c0c0e] border border-slate-300 dark:border-white/15 focus:border-[#059669] focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 text-base font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all outline-none"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Solicitado exclusivamente para emissão da cobrança registrada no sistema bancário (Asaas / Banco Central).
                </p>
              </div>
            )}

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
            {activeError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-rose-600 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{activeError}</span>
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
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl text-base font-bold text-white bg-[#059669] hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>
                        {isExistingSubscriptionChange
                          ? 'Atualizando assinatura...'
                          : 'Redirecionando para o Asaas...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {isExistingSubscriptionChange
                          ? isUpgradeFromBasic
                            ? 'Confirmar Upgrade para Pro'
                            : 'Agendar mudança para Basic no próximo ciclo'
                          : 'Ir para o pagamento'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Voltar aos planos
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 text-center">
              <Lock className="w-3.5 h-3.5 text-[#059669] dark:text-emerald-400 shrink-0" />
              <span>Pagamento processado no ambiente criptografado do Asaas. Não armazenamos dados de cartão.</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
