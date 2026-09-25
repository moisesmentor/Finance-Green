import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  BellRing, 
  Calendar, 
  CreditCard, 
  Check,
  Bell
} from 'lucide-react';
import { Transaction, Category } from '../types';
import { CATEGORIES, PAYMENT_METHODS } from '../utils/constants';
import { formatCurrency, formatDateReadable, formatDateShort, getDueDateStatus, DueDateStatus } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface DueAlertsBannerProps {
  transactions: Transaction[];
  onMarkAsPaid: (id: string) => void;
  categories?: Category[];
}

export const DueAlertsBanner: React.FC<DueAlertsBannerProps> = ({
  transactions,
  onMarkAsPaid,
  categories,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const activeCategories = useMemo(() => categories || CATEGORIES, [categories]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of activeCategories) {
      map.set(c.id, c);
    }
    return map;
  }, [activeCategories]);

  const paymentMethodMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const pm of PAYMENT_METHODS) {
      map.set(pm.id, pm.label);
    }
    return map;
  }, []);

  // Filter pending expense transactions and classify urgency
  const { urgentItems, totalOverdueAmount, overdueCount, todayCount, totalTodayAmount, upcomingCount, totalUpcomingAmount } = useMemo(() => {
    const pendingExpenses = transactions.filter(
      t => t.type === 'expense' && t.status === 'pending' && t.date
    );

    const itemsWithStatus = pendingExpenses
      .map(t => ({
        ...t,
        dueStatus: getDueDateStatus(t.date),
      }))
      .filter(t => t.dueStatus.urgency !== 'normal');

    // Sort: overdue first (most overdue first: lowest diffDays), then today, then upcoming
    itemsWithStatus.sort((a, b) => a.dueStatus.diffDays - b.dueStatus.diffDays);

    let overdueAmt = 0;
    let overdueCnt = 0;
    let todayAmt = 0;
    let todayCnt = 0;
    let upcomingAmt = 0;
    let upcomingCnt = 0;

    for (const item of itemsWithStatus) {
      if (item.dueStatus.urgency === 'overdue') {
        overdueAmt += item.amount;
        overdueCnt++;
      } else if (item.dueStatus.urgency === 'today') {
        todayAmt += item.amount;
        todayCnt++;
      } else if (item.dueStatus.urgency === 'upcoming') {
        upcomingAmt += item.amount;
        upcomingCnt++;
      }
    }

    return {
      urgentItems: itemsWithStatus,
      totalOverdueAmount: overdueAmt,
      overdueCount: overdueCnt,
      todayCount: todayCnt,
      totalTodayAmount: todayAmt,
      upcomingCount: upcomingCnt,
      totalUpcomingAmount: upcomingAmt,
    };
  }, [transactions]);

  // Request browser notification permission
  const handleRequestNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationStatus(perm);
        if (perm === 'granted' && urgentItems.length > 0) {
          new Notification('Finance Pro - Alerta de Contas', {
            body: `Você possui ${urgentItems.length} conta(s) pendente(s) próxima(s) do vencimento.`,
            icon: '/favicon.svg',
          });
        }
      } catch (err) {
        console.error('Erro ao pedir permissão de notificação:', err);
      }
    }
  };

  // If there are no urgent bills (overdue, today, or next 3 days), render nothing
  if (urgentItems.length === 0) {
    return null;
  }

  const hasOverdue = overdueCount > 0;
  const hasToday = todayCount > 0;

  return (
    <section 
      id="due-alerts-banner"
      aria-label="Alertas de Vencimento"
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
        hasOverdue 
          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-500/30' 
          : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-500/30'
      }`}
    >
      {/* Banner Header */}
      <div className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
              hasOverdue
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
            }`}
          >
            {hasOverdue ? <AlertTriangle className="w-5 h-5" /> : <BellRing className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                {hasOverdue 
                  ? 'Contas com Vencimento Crítico' 
                  : hasToday 
                    ? 'Contas Vencendo Hoje' 
                    : 'Contas Próximas do Vencimento'
                }
              </h3>
              <span 
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  hasOverdue
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                }`}
              >
                {urgentItems.length} {urgentItems.length === 1 ? 'conta pendente' : 'contas pendentes'}
              </span>
            </div>

            {/* Subtitle with details */}
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
              {hasOverdue && (
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {overdueCount} atrasada{overdueCount > 1 ? 's' : ''} ({formatCurrency(totalOverdueAmount)})
                </span>
              )}
              {hasOverdue && (hasToday || upcomingCount > 0) && <span>•</span>}
              {hasToday && (
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {todayCount} vence{todayCount > 1 ? 'm' : ''} hoje ({formatCurrency(totalTodayAmount)})
                </span>
              )}
              {hasToday && upcomingCount > 0 && <span>•</span>}
              {upcomingCount > 0 && (
                <span className="text-slate-500 dark:text-slate-400">
                  {upcomingCount} nos próximos 3 dias ({formatCurrency(totalUpcomingAmount)})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {notificationStatus === 'default' && (
            <button
              onClick={handleRequestNotification}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer shadow-xs"
              title="Ativar lembretes no navegador"
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Ativar Notificações</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Recolher' : 'Ver Contas'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible List of Urgent Items */}
      {isExpanded && (
        <div className="border-t border-slate-200/60 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/[0.06] bg-white/70 dark:bg-black/40">
          {urgentItems.map(item => {
            const cat = categoryMap.get(item.categoryId) || {
              id: 'outros',
              name: 'Geral',
              icon: 'MoreHorizontal',
              color: '#64748b',
              type: 'expense' as const,
            };

            const isOverdue = item.dueStatus.urgency === 'overdue';
            const isToday = item.dueStatus.urgency === 'today';

            return (
              <div
                key={item.id}
                className="p-3 sm:px-4.5 sm:py-3 hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                {/* Item Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: `${cat.color}15`,
                      borderColor: `${cat.color}30`,
                      color: cat.color,
                    }}
                  >
                    <CategoryIcon name={cat.icon} className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.description}
                      </span>

                      {/* Urgency Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.dueStatus.badgeClass}`}
                      >
                        {isOverdue && <AlertTriangle className="w-2.5 h-2.5" />}
                        {isToday && <Clock className="w-2.5 h-2.5" />}
                        <span>{item.dueStatus.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
                      <span>•</span>
                      <span>{paymentMethodMap.get(item.paymentMethod) || item.paymentMethod}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDateReadable(item.date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount & 1-Click "Dar Baixa / Pagar" Action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-sm sm:text-base font-extrabold font-mono-num text-slate-900 dark:text-white">
                    {formatCurrency(item.amount)}
                  </span>

                  <button
                    onClick={() => onMarkAsPaid(item.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-xs cursor-pointer"
                    title="Marcar como Pago e dar baixa imediata"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Dar Baixa</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
