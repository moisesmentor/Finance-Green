import React, { useState } from 'react';
import {
  X,
  Crown,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Trash2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { PlanTier, ThemeMode, UserProfile, UserSubscription } from '../types';
import { ADMIN_EMAILS, PLAN_DETAILS, getEffectivePlan } from '../utils/permissions';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  subscription: UserSubscription;
  theme: ThemeMode;
  onSelectPlanForCheckout: (plan: Exclude<PlanTier, 'free'>) => void;
  onCancelSubscription: () => Promise<void>;
  onRequestRefund: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onOpenLandingPlans: () => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatPaymentMethod(method?: UserSubscription['paymentMethod']): string {
  switch (method) {
    case 'CREDIT_CARD':
      return 'Cartão de Crédito';
    case 'PIX':
      return 'Pix';
    case 'BOLETO':
      return 'Boleto Bancário';
    case 'MANUAL':
      return 'Liberação Administrativa';
    default:
      return 'Checkout Asaas (Cartão, Pix ou Boleto)';
  }
}

function formatDateBr(dateInput?: number | string | null): string | null {
  if (!dateInput) return null;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  user,
  subscription,
  theme,
  onSelectPlanForCheckout,
  onCancelSubscription,
  onRequestRefund,
  onDeleteAccount,
  onOpenLandingPlans,
}) => {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [activeAction, setActiveAction] = useState<'cancel' | 'refund' | 'delete' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const isAdmin = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase()));
  const isLifetime = Boolean(subscription.isLifetime || subscription.status === 'lifetime' || isAdmin);
  const effectivePlan = getEffectivePlan(subscription, user?.email);
  const currentPlanInfo = PLAN_DETAILS[effectivePlan];

  const now = Date.now();
  const hasRemainingPaidTime =
    typeof subscription.currentPeriodEnd === 'number' && subscription.currentPeriodEnd > now;

  // Cálculo da garantia de 7 dias após o primeiro pagamento confirmado
  const firstPaidAt = subscription.firstPaymentConfirmedAt || (subscription.status === 'active' ? subscription.subscribedAt : null);
  const elapsedSinceFirstPayment = firstPaidAt ? now - firstPaidAt : null;
  const isWithinSevenDayGuarantee =
    !isLifetime &&
    Boolean(firstPaidAt) &&
    elapsedSinceFirstPayment !== null &&
    elapsedSinceFirstPayment >= 0 &&
    elapsedSinceFirstPayment <= SEVEN_DAYS_MS &&
    subscription.refundStatus !== 'refunded' &&
    subscription.refundStatus !== 'pending_manual';

  const remainingGuaranteeDays = isWithinSevenDayGuarantee && elapsedSinceFirstPayment !== null
    ? Math.max(1, Math.ceil((SEVEN_DAYS_MS - elapsedSinceFirstPayment) / (24 * 60 * 60 * 1000)))
    : 0;

  const canCancelSubscription =
    !isLifetime &&
    (subscription.status === 'active' ||
      subscription.status === 'past_due' ||
      subscription.status === 'pending') &&
    Boolean(subscription.asaasSubscriptionId || subscription.plan !== 'free');

  const periodEndLabel = formatDateBr(subscription.currentPeriodEnd);
  const nextDueLabel = formatDateBr(subscription.nextDueDate) || periodEndLabel;

  const handleRunCancel = async () => {
    setErrorMsg(null);
    setActiveAction('cancel');
    try {
      await onCancelSubscription();
      setConfirmCancel(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível cancelar a assinatura agora.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleRunRefund = async () => {
    setErrorMsg(null);
    setActiveAction('refund');
    try {
      await onRequestRefund();
      setConfirmRefund(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível solicitar o reembolso agora.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleRunDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR') {
      setErrorMsg('Digite EXCLUIR no campo de confirmação para prosseguir.');
      return;
    }
    setErrorMsg(null);
    setActiveAction('delete');
    try {
      await onDeleteAccount();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível excluir sua conta agora.');
      setActiveAction(null);
    }
  };

  // Status badge config
  const getStatusBadge = () => {
    if (isLifetime) {
      return {
        label: 'Acesso Vitalício',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      };
    }
    switch (subscription.status) {
      case 'active':
        return {
          label: 'Assinatura Ativa',
          className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        };
      case 'pending':
        return {
          label: 'Aguardando Pagamento',
          className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        };
      case 'past_due':
        return {
          label: 'Pagamento em Atraso',
          className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        };
      case 'canceled':
        return {
          label: hasRemainingPaidTime && effectivePlan !== 'free'
            ? `Cancelada (acesso até ${periodEndLabel})`
            : 'Assinatura Encerrada',
          className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
        };
      default:
        return {
          label: 'Plano Grátis Permanente',
          className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-modal-title"
    >
      <div
        className={`relative w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden my-auto transition-colors ${
          isDark
            ? 'bg-[#121215] border-white/10 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Accent Bar */}
        <div
          className={`h-1.5 w-full ${
            effectivePlan === 'pro'
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
              : effectivePlan === 'basic'
              ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
              : 'bg-slate-400 dark:bg-slate-700'
          }`}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                effectivePlan === 'pro'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'bg-teal-500/15 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/30'
              }`}
            >
              {effectivePlan === 'pro' ? (
                <Crown className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 id="subscription-modal-title" className="text-lg font-extrabold tracking-tight">
                Minha Assinatura
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie seu plano, cobranças, reembolso e cancelamento em 1 clique
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(activeAction)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="rounded-xl p-3.5 bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Resumo do Plano Atual */}
          <div
            className={`rounded-xl p-4 border ${
              isDark ? 'bg-[#18181d] border-white/10' : 'bg-slate-50 border-slate-200/90'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Plano em vigor na sua conta
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {currentPlanInfo.name}
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {currentPlanInfo.priceFormatted}
                    {effectivePlan !== 'free' && !isLifetime ? '/mês' : ''}
                  </span>
                </div>
              </div>

              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            </div>

            {/* Detalhes de Cobrança e Vencimento */}
            {!isLifetime && (subscription.status !== 'none' || effectivePlan !== 'free') && (
              <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">
                      {subscription.status === 'canceled'
                        ? 'Acesso liberado até'
                        : 'Próxima renovação / vencimento'}
                    </span>
                    <span className="font-bold">
                      {subscription.status === 'canceled'
                        ? periodEndLabel || 'Encerrado'
                        : nextDueLabel || 'Mensal recorrente'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Forma de pagamento</span>
                    <span className="font-bold">{formatPaymentMethod(subscription.paymentMethod)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Aviso de Downgrade Agendado */}
            {subscription.pendingPlan === 'basic' && subscription.status === 'active' && (
              <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-white/10 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Mudança agendada: você continua com todos os recursos <strong>Pro</strong> até{' '}
                  <strong>{periodEndLabel || 'o fim do ciclo atual'}</strong>. Na próxima renovação, sua
                  assinatura passará para o plano <strong>Basic (R$ 19,90/mês)</strong>.
                </span>
              </div>
            )}

            {/* Aviso de Reembolso Pendente Manual (Boleto) */}
            {subscription.refundStatus === 'pending_manual' && (
              <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-white/10 flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Sua solicitação de reembolso integral dentro da garantia de 7 dias foi registrada e sua
                  assinatura já está cancelada.
                </span>
              </div>
            )}
          </div>

          {/* 2. Alerta se estiver Past Due ou Pending com link direto para fatura no Asaas */}
          {(subscription.status === 'past_due' || subscription.status === 'pending') && (
            <div
              className={`rounded-xl p-4 border ${
                subscription.status === 'past_due'
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    subscription.status === 'past_due' ? 'text-rose-500' : 'text-amber-500'
                  }`}
                />
                <div className="flex-1 text-xs space-y-2">
                  <p className="font-bold text-slate-900 dark:text-white">
                    {subscription.status === 'past_due'
                      ? 'Sua mensalidade está em atraso (período de tolerância ativo)'
                      : `Aguardando confirmação do pagamento do plano ${
                          PLAN_DETAILS[subscription.pendingPlan || subscription.plan]?.name || ''
                        }`}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {subscription.status === 'past_due'
                      ? `Mantenha seus recursos pagos ativos regularizando a fatura até ${
                          periodEndLabel || 'o fim do prazo de tolerância'
                        }. Seus dados nunca são apagados.`
                      : 'Assim que o Asaas confirmar seu pagamento (Cartão, Pix ou Boleto), os recursos do plano serão liberados automaticamente.'}
                  </p>
                  {subscription.asaasCheckoutUrl && (
                    <a
                      href={subscription.asaasCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                    >
                      <span>Abrir fatura segura no Asaas</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. Troca de Plano (Upgrade / Downgrade / Assinar) */}
          {!isLifetime && (
            <div
              className={`rounded-xl p-4 border space-y-3 ${
                isDark ? 'bg-[#151519] border-white/10' : 'bg-white border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Alterar Plano
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLandingPlans();
                  }}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Comparar planos em /assinatura
                </button>
              </div>

              {effectivePlan === 'free' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectPlanForCheckout('basic');
                    }}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 bg-slate-50 dark:bg-white/[0.03] transition-all cursor-pointer text-left"
                  >
                    <div>
                      <span className="text-xs font-bold block text-slate-900 dark:text-white">
                        Assinar Basic
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        R$ 19,90/mês • OFX/CSV, Tetos e Backup
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectPlanForCheckout('pro');
                    }}
                    className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all cursor-pointer text-left"
                  >
                    <div>
                      <span className="text-xs font-bold block text-emerald-700 dark:text-emerald-300">
                        Assinar Pro
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">
                        R$ 29,90/mês • Reserva, Patrimônio e Anual
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
                  </button>
                </div>
              )}

              {effectivePlan === 'basic' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectPlanForCheckout('pro');
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all cursor-pointer text-left"
                >
                  <div>
                    <span className="text-xs sm:text-sm font-bold block text-emerald-700 dark:text-emerald-300">
                      Fazer Upgrade para o Plano Pro (R$ 29,90/mês)
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      Libera Reserva de Emergência, Patrimônio e Visão Anual imediatamente
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
                </button>
              )}

              {effectivePlan === 'pro' && subscription.pendingPlan !== 'basic' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectPlanForCheckout('basic');
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-white/[0.03] transition-all cursor-pointer text-left"
                >
                  <div>
                    <span className="text-xs sm:text-sm font-bold block text-slate-800 dark:text-slate-200">
                      Mudar para o Plano Basic (R$ 19,90/mês no próximo ciclo)
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Você mantém o acesso Pro até o fim do período já pago
                    </span>
                  </div>
                  <ArrowDownRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              )}
            </div>
          )}

          {/* 4. Garantia de 7 Dias (Reembolso Integral - Art. 49 do CDC) */}
          {isWithinSevenDayGuarantee && (
            <div className="rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Garantia Incondicional de 7 Dias Ativa ({remainingGuaranteeDays}{' '}
                      {remainingGuaranteeDays === 1 ? 'dia restante' : 'dias restantes'})
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      Conforme prometido na página de planos (Art. 49 do CDC), você pode solicitar o
                      estorno integral do seu primeiro pagamento em 1 clique.
                    </p>
                  </div>
                </div>
              </div>

              {!confirmRefund ? (
                <button
                  type="button"
                  onClick={() => setConfirmRefund(true)}
                  disabled={Boolean(activeAction)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Solicitar reembolso integral</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#18181d] border border-emerald-500/30 space-y-2.5 text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Confirmar pedido de reembolso integral e retorno ao plano Grátis?
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    • Pagamentos via <strong>Cartão ou Pix</strong> são estornados automaticamente pelo Asaas.
                    <br />• Pagamentos via <strong>Boleto</strong> têm a assinatura cancelada na hora e o
                    pedido de devolução bancária registrado para nossa equipe.
                    <br />• Seus lançamentos, metas e patrimônio <strong>não são apagados</strong>.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRunRefund}
                      disabled={activeAction === 'refund'}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {activeAction === 'refund' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processando estorno...</span>
                        </>
                      ) : (
                        <span>Confirmar reembolso integral</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRefund(false)}
                      disabled={activeAction === 'refund'}
                      className="px-3 py-2 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Cancelamento em 1 Clique (Sem Multa, Mantendo Acesso até o Fim do Período Pago) */}
          {canCancelSubscription && (
            <div
              className={`rounded-xl p-4 border space-y-3 ${
                isDark ? 'bg-[#151519] border-white/10' : 'bg-slate-50/70 border-slate-200/90'
              }`}
            >
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Cancelamento sem multa e sem burocracia
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Ao cancelar, nenhuma nova cobrança será gerada. Você mantém o acesso aos recursos do
                  seu plano até o fim do período já pago ({periodEndLabel || 'ciclo atual'}), e todos os
                  seus dados continuam salvos no plano Grátis.
                </p>
              </div>

              {!confirmCancel ? (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  disabled={Boolean(activeAction)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors cursor-pointer"
                >
                  <span>Cancelar assinatura</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5 text-xs">
                  <p className="font-bold text-rose-700 dark:text-rose-300">
                    Tem certeza que deseja cancelar a renovação automática da sua assinatura?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRunCancel}
                      disabled={activeAction === 'cancel'}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {activeAction === 'cancel' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Cancelando no Asaas...</span>
                        </>
                      ) : (
                        <span>Sim, cancelar em 1 clique</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                      disabled={activeAction === 'cancel'}
                      className="px-3 py-2 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Manter assinatura
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Exclusão de Conta (Cancela Assinatura no Asaas antes de apagar dados) */}
          <div className="pt-2 border-t border-slate-200/70 dark:border-white/10">
            {!confirmDeleteAccount ? (
              <button
                type="button"
                onClick={() => setConfirmDeleteAccount(true)}
                disabled={Boolean(activeAction)}
                className="text-xs text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desejo excluir permanentemente minha conta e todos os meus dados</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3 text-xs">
                <p className="font-bold text-rose-700 dark:text-rose-300">
                  Atenção: Exclusão Definitiva de Conta e Dados (LGPD)
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Se você tiver uma assinatura ativa no Asaas, ela será{' '}
                  <strong>cancelada automaticamente primeiro</strong> para garantir que nunca mais haja
                  cobranças. Em seguida, todos os seus dados no Firestore e seu login serão removidos em
                  definitivo.
                </p>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Digite EXCLUIR para confirmar:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="EXCLUIR"
                    style={{ fontSize: '16px' }}
                    className={`w-full px-3 py-2 rounded-lg border text-base font-bold outline-none ${
                      isDark
                        ? 'bg-[#121215] border-white/15 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunDeleteAccount}
                    disabled={activeAction === 'delete'}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {activeAction === 'delete' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Cancelando assinatura e excluindo...</span>
                      </>
                    ) : (
                      <span>Excluir minha conta permanentemente</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteAccount(false);
                      setDeleteConfirmationText('');
                    }}
                    disabled={activeAction === 'delete'}
                    className="px-3 py-2 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
