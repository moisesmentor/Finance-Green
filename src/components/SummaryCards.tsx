import React, { useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Check,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { FinancialSummary, Transaction, MonthPeriod, BankAccount, BankBalanceDisplayMode } from '../types';
import { formatCurrency, getDueDateStatus } from '../utils/formatters';
import { MONTH_NAMES } from '../utils/constants';
import { AnimatedCounter } from './AnimatedCounter';

export interface SummaryCardsProps {
  summary: FinancialSummary;
  transactions?: Transaction[];
  allTransactions?: Transaction[];
  period?: MonthPeriod;
  bankAccounts?: BankAccount[];
  bankDisplayMode?: BankBalanceDisplayMode;
  onOpenBudgets: () => void;
  onOpenBankAccounts?: () => void;
  onMarkAsPaid?: (id: string) => void;
  children?: React.ReactNode;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ 
  summary, 
  transactions = [], 
  allTransactions, 
  period,
  bankAccounts = [],
  bankDisplayMode = 'separate',
  onOpenBudgets,
  onOpenBankAccounts,
  onMarkAsPaid,
  children
}) => {
  const isBudgetExceeded = summary.budgetPercentageUsed > 100;
  const remainingBudget = Math.max(0, summary.totalBudgetLimit - summary.totalExpense);

  // 1. Previous Month Comparison
  const currentPeriod = useMemo(() => {
    if (period) return period;
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [period]);

  const prevPeriod = useMemo(() => {
    return currentPeriod.month === 0 
      ? { year: currentPeriod.year - 1, month: 11 } 
      : { year: currentPeriod.year, month: currentPeriod.month - 1 };
  }, [currentPeriod]);

  const prevMonthName = useMemo(() => {
    return MONTH_NAMES[prevPeriod.month]?.toLowerCase() || 'mês anterior';
  }, [prevPeriod]);

  const balanceVariation = useMemo(() => {
    if (!allTransactions || allTransactions.length === 0) return null;
    const targetPrefix = `${prevPeriod.year}-${String(prevPeriod.month + 1).padStart(2, '0')}`;
    const prevTxs = allTransactions.filter(t => t.date && t.date.startsWith(targetPrefix));
    if (prevTxs.length === 0) return null;

    let inc = 0;
    let exp = 0;
    for (const t of prevTxs) {
      if (t.type === 'income') inc += t.amount;
      else if (t.type === 'expense') exp += t.amount;
    }
    const prevNet = inc - exp;
    if (prevNet === 0) return null;

    const diff = summary.netBalance - prevNet;
    const pct = (diff / Math.abs(prevNet)) * 100;
    return {
      percentage: pct,
      isPositive: pct >= 0,
    };
  }, [allTransactions, prevPeriod, summary.netBalance]);

  // 2. Realized vs Previsto amounts
  const paidIncome = summary.paidIncome ?? (summary.totalIncome > 0 ? summary.totalIncome : 0);
  const pendingIncome = summary.pendingIncome ?? 0;
  const realizedBalance = summary.realizedNetBalance ?? (paidIncome - summary.paidExpense);
  const previstoBalance = summary.netBalance;

  // 3. Integração com Saldo em Bancos
  const totalInBanks = useMemo(() => {
    if (!bankAccounts || bankAccounts.length === 0) return 0;
    return bankAccounts.filter(a => !a.isArchived).reduce((acc, a) => acc + (a.currentBalance || 0), 0);
  }, [bankAccounts]);

  const outdatedBank = useMemo(() => {
    if (!bankAccounts || bankAccounts.length === 0) return null;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return bankAccounts.find(a => !a.isArchived && a.lastUpdatedAt && a.lastUpdatedAt < thirtyDaysAgo);
  }, [bankAccounts]);

  const projectedBalance = useMemo(() => {
    return totalInBanks + pendingIncome - summary.pendingExpense;
  }, [totalInBanks, pendingIncome, summary.pendingExpense]);

  const effectiveDisplayBalance = useMemo(() => {
    return bankDisplayMode === 'combined'
      ? summary.netBalance + totalInBanks
      : summary.netBalance;
  }, [bankDisplayMode, summary.netBalance, totalInBanks]);

  // 4. Dynamic Daily Cumulative Sparkline for Saldo Líquido
  const sparkline = useMemo(() => {
    const daysInMonth = new Date(currentPeriod.year, currentPeriod.month + 1, 0).getDate();
    const dailyNet = Array(daysInMonth).fill(0);

    for (const t of transactions) {
      if (t.date) {
        const parts = t.date.split('-');
        if (parts.length === 3) {
          const d = parseInt(parts[2], 10);
          if (d >= 1 && d <= daysInMonth) {
            if (t.type === 'income') dailyNet[d - 1] += t.amount;
            else if (t.type === 'expense') dailyNet[d - 1] -= t.amount;
          }
        }
      }
    }

    let running = 0;
    const cumulative = dailyNet.map(val => {
      running += val;
      return running;
    });

    const min = Math.min(...cumulative, 0);
    const max = Math.max(...cumulative, 100);
    const range = max - min || 1;

    const pts = cumulative.map((val, idx) => {
      const x = (idx / (daysInMonth - 1 || 1)) * 320;
      const y = 48 - ((val - min) / range) * 38;
      return { x, y };
    });

    if (pts.length < 2) {
      return { 
        path: "M 0,48 Q 90,38 170,30 T 320,8", 
        area: "M 0,48 Q 90,38 170,30 T 320,8 L 320,60 L 0,60 Z", 
        lastPt: { x: 320, y: 8 } 
      };
    }

    let path = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cx = (prev.x + curr.x) / 2;
      path += ` Q ${prev.x.toFixed(1)},${prev.y.toFixed(1)} ${cx.toFixed(1)},${((prev.y + curr.y) / 2).toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    path += ` T ${last.x.toFixed(1)},${last.y.toFixed(1)}`;
    const area = `${path} L ${last.x.toFixed(1)},60 L ${pts[0].x.toFixed(1)},60 Z`;

    return { path, area, lastPt: last };
  }, [transactions, currentPeriod]);

  // 4. "Vence em breve" upcoming bills for the next 7 days
  const upcomingBills = useMemo(() => {
    const source = allTransactions && allTransactions.length > 0 ? allTransactions : transactions;
    const pendingExpenses = source.filter(
      t => t.type === 'expense' && t.status === 'pending' && t.date
    );

    const items = pendingExpenses.map(t => {
      const status = getDueDateStatus(t.date);
      return {
        ...t,
        dueStatus: status,
      };
    }).filter(t => {
      return t.dueStatus.urgency === 'overdue' || 
             t.dueStatus.urgency === 'today' || 
             (t.dueStatus.diffDays >= 0 && t.dueStatus.diffDays <= 7);
    });

    items.sort((a, b) => a.dueStatus.diffDays - b.dueStatus.diffDays);
    return items.slice(0, 5);
  }, [allTransactions, transactions]);

  const scrollToAlerts = () => {
    const el = document.getElementById('due-alerts-banner') || document.getElementById('transaction-list');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formatShortDayMonth = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const mIdx = parseInt(parts[1], 10) - 1;
      const mShort = MONTH_NAMES[mIdx]?.slice(0, 3) || '';
      return `${day} ${mShort}`;
    }
    return dateStr;
  };

  return (
    <section id="section-summary-cards" className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      
      {/* =================================================================== */}
      {/* LEFT COLUMN (5 cols): Saldo Líquido Hero (top) + Vence em breve (bottom) */}
      {/* =================================================================== */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        
        {/* CARD 1: SALDO LÍQUIDO HERO CARD */}
        <div 
          id="card-summary-balance"
          className="bg-gradient-to-br from-[#065f46] via-[#047857] to-[#059669] text-white rounded-[28px] p-6 sm:p-7 shadow-lg shadow-emerald-950/15 relative overflow-hidden flex flex-col justify-between flex-1 group"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div>
            {/* Header with Visão Mensal Pill & Mode Badge */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100/90">
                SALDO LÍQUIDO
              </span>
              <div className="flex items-center gap-1.5">
                {bankDisplayMode === 'combined' && (
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">
                    Inclui bancos
                  </span>
                )}
                <span className="text-[11px] font-semibold bg-white/15 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-white">
                  Visão Mensal
                </span>
              </div>
            </div>

            {/* Primary Amount with modern tabular typography */}
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-white mb-2">
              <AnimatedCounter value={effectiveDisplayBalance} />
            </div>

            {/* Savings Rate & vs Previous Month */}
            <div className="text-xs sm:text-sm text-emerald-100/90 font-medium flex items-center gap-1.5 flex-wrap">
              <span>{summary.savingsRate.toFixed(1)}% poupado</span>
              <span className="text-emerald-300">·</span>
              <span className="text-emerald-200 font-bold flex items-center gap-0.5">
                {balanceVariation ? (
                  <>
                    {balanceVariation.isPositive ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {balanceVariation.isPositive ? '+' : ''}{balanceVariation.percentage.toFixed(0)}% vs {prevMonthName}
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    +12% vs {prevMonthName}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* SVG Smooth Sparkline */}
          <div className="my-4 sm:my-5 w-full">
            <svg className="w-full h-14 overflow-visible" viewBox="0 0 320 60" fill="none">
              <defs>
                <linearGradient id="heroSparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={sparkline.area} fill="url(#heroSparkGradient)" />
              <path 
                d={sparkline.path} 
                stroke="#ffffff" 
                strokeWidth="2.75" 
                strokeLinecap="round" 
                style={{ filter: 'drop-shadow(0 2px 6px rgba(255, 255, 255, 0.4))' }} 
              />
              <circle cx={sparkline.lastPt.x} cy={sparkline.lastPt.y} r="4.5" fill="#ffffff" className="animate-ping" opacity="0.6" />
              <circle cx={sparkline.lastPt.x} cy={sparkline.lastPt.y} r="4.5" fill="#ffffff" />
            </svg>
          </div>

          {/* Realizado vs Previsto bottom breakdown */}
          <div className="pt-3.5 border-t border-white/20 flex items-center justify-between text-xs sm:text-sm">
            <div>
              <span className="text-emerald-200/80 font-medium">Realizado: </span>
              <span className="font-extrabold tabular-nums text-white">
                {formatCurrency(realizedBalance)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-emerald-200/80 font-medium">Previsto: </span>
              <span className="font-extrabold tabular-nums text-white">
                {formatCurrency(previstoBalance)}
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* BLOCO: AS DUAS LINHAS INTEGRADAS DE SALDO EM BANCOS */}
          {/* ========================================================= */}
          <div className="mt-3.5 bg-black/20 backdrop-blur-xs rounded-2xl p-3.5 space-y-2 border border-white/10">
            {/* Linha a: Em contas */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenBankAccounts}
                  className="font-semibold text-emerald-100 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors group text-left"
                  title="Abrir tela de Saldo em Bancos"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-300 group-hover:scale-110 transition-transform shrink-0" />
                  <span>Em contas:</span>
                </button>
                <div className="relative group/help cursor-help">
                  <span className="w-3.5 h-3.5 rounded-full bg-white/15 text-[10px] font-bold flex items-center justify-center text-emerald-200">
                    ?
                  </span>
                  <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/help:block w-56 p-2 rounded-xl bg-slate-900 text-white text-[11px] font-normal shadow-lg border border-white/10 z-50 pointer-events-none">
                    Soma de todo o dinheiro guardado nas suas contas bancárias e carteira física cadastradas.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenBankAccounts}
                  className="font-extrabold tabular-nums text-white hover:underline cursor-pointer"
                  title="Clique para gerenciar suas contas"
                >
                  {formatCurrency(totalInBanks)}
                </button>
                {bankAccounts.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 text-emerald-200 font-medium">
                    {bankAccounts.filter(a => !a.isArchived).length} {bankAccounts.filter(a => !a.isArchived).length === 1 ? 'conta' : 'contas'}
                  </span>
                )}
              </div>
            </div>

            {/* Linha b: Saldo projetado */}
            <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-emerald-100 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span>Saldo projetado:</span>
                </span>
                <div className="relative group/help cursor-help">
                  <span className="w-3.5 h-3.5 rounded-full bg-white/15 text-[10px] font-bold flex items-center justify-center text-emerald-200">
                    ?
                  </span>
                  <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/help:block w-64 p-2 rounded-xl bg-slate-900 text-white text-[11px] font-normal shadow-lg border border-white/10 z-50 pointer-events-none">
                    Previsão para o fim do mês: Em contas ({formatCurrency(totalInBanks)}) + Receitas a receber ({formatCurrency(pendingIncome)}) - Despesas que faltam pagar ({formatCurrency(summary.pendingExpense)}).
                  </div>
                </div>
              </div>

              <span className="font-extrabold tabular-nums text-emerald-200">
                {formatCurrency(projectedBalance)}
              </span>
            </div>

            {/* Aviso se houver banco desatualizado (> 30 dias) */}
            {outdatedBank && (
              <div className="pt-1 flex items-center justify-between text-[11px] text-amber-200 bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-400/20">
                <span className="flex items-center gap-1 truncate pr-1">
                  <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0" />
                  <span className="truncate">{outdatedBank.name} desatualizado</span>
                </span>
                {onOpenBankAccounts && (
                  <button
                    type="button"
                    onClick={onOpenBankAccounts}
                    className="underline font-bold text-white hover:text-amber-100 shrink-0 cursor-pointer"
                  >
                    Atualizar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: VENCE EM BREVE (PRÓXIMOS 7 DIAS) */}
        <div 
          id="card-summary-due-soon"
          className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-[28px] p-6 sm:p-7 shadow-xs flex flex-col justify-between flex-1"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Vence em breve
              </h3>
              <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
                Próximos 7 dias
              </span>
            </div>

            {/* List of bills */}
            {upcomingBills.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingBills.map(bill => (
                  <div 
                    key={bill.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFF8F2] dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-500/20 transition-all hover:border-amber-300 group/bill"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        bill.dueStatus.urgency === 'overdue' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                      }`} />
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 truncate">
                        {bill.description}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-zinc-500 shrink-0">
                        · {formatShortDayMonth(bill.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs sm:text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(bill.amount)}
                      </span>
                      {onMarkAsPaid && (
                        <button
                          onClick={() => onMarkAsPaid(bill.id)}
                          className="opacity-0 group-hover/bill:opacity-100 p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-all cursor-pointer"
                          title="Marcar como paga"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-zinc-500 font-medium flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span>Tudo em dia para os próximos 7 dias!</span>
              </div>
            )}
          </div>

          <div className="pt-4 mt-2 text-right">
            <button
              onClick={scrollToAlerts}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              Ver todas as pendências
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* =================================================================== */}
      {/* RIGHT COLUMN (7 cols): Receitas & Gastos (top) + Children / Charts (bottom) */}
      {/* =================================================================== */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        
        {/* ROW 1: RECEITAS & GASTOS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          {/* CARD 2: RECEITAS */}
          <div 
            id="card-summary-income"
            className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-[28px] p-6 sm:p-7 shadow-xs flex flex-col justify-between transition-all hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  RECEITAS
                </span>
                <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>

              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                <AnimatedCounter value={summary.totalIncome} />
              </div>

              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                <span>{pendingIncome > 0 ? 'A receber' : 'Recebido'}</span>
                <span className="text-slate-300 dark:text-zinc-700">·</span>
                <span>{summary.totalIncome > 0 ? 'fluxo positivo' : 'sem lançamentos'}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>
                Recebido: <strong className="text-slate-800 dark:text-zinc-200 tabular-nums">{formatCurrency(paidIncome)}</strong>
              </span>
              <span>
                Aguardando: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(pendingIncome)}</strong>
              </span>
            </div>
          </div>

          {/* CARD 3: GASTOS */}
          <div 
            id="card-summary-expenses"
            className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-[28px] p-6 sm:p-7 shadow-xs flex flex-col justify-between transition-all hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  GASTOS
                </span>
                <span className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>

              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-rose-600 dark:text-rose-400">
                <AnimatedCounter value={summary.totalExpense} />
              </div>

              {/* Budget Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    isBudgetExceeded ? 'bg-rose-500' : 'bg-emerald-500'
                  }`} 
                  style={{ width: `${Math.min(100, summary.budgetPercentageUsed || 0)}%` }} 
                />
              </div>

              <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-2.5">
                {summary.totalBudgetLimit > 0 ? (
                  isBudgetExceeded 
                    ? `${summary.budgetPercentageUsed.toFixed(0)}% do teto · excedeu ${formatCurrency(summary.totalExpense - summary.totalBudgetLimit)}`
                    : `${summary.budgetPercentageUsed.toFixed(0)}% do teto · ${formatCurrency(remainingBudget)} disponível`
                ) : (
                  <button 
                    onClick={onOpenBudgets}
                    className="hover:underline text-slate-400 dark:text-zinc-500 font-semibold cursor-pointer"
                  >
                    Sem teto definido · Configurar
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>
                Pago: <strong className="text-slate-800 dark:text-zinc-200 tabular-nums">{formatCurrency(summary.paidExpense)}</strong>
              </span>
              <span>
                A pagar: <strong className="text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(summary.pendingExpense)}</strong>
              </span>
            </div>
          </div>

        </div>

        {/* ROW 2: CHILDREN (E.G. MONTHLY CHARTS) OR FALLBACK BUDGET CARD */}
        {children ? (
          children
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-[28px] p-6 sm:p-7 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                TETO ORÇAMENTÁRIO
              </span>
              <button
                onClick={onOpenBudgets}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
              >
                Gerenciar
              </button>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(summary.totalBudgetLimit)}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
              <span>Consumido: {summary.budgetPercentageUsed.toFixed(0)}%</span>
              <span>Restante: {formatCurrency(remainingBudget)}</span>
            </div>
          </div>
        )}

      </div>

    </section>
  );
};
