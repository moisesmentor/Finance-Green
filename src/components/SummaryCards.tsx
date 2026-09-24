import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight
} from 'lucide-react';
import { FinancialSummary } from '../types';
import { formatCurrency } from '../utils/formatters';
import { AnimatedCounter } from './AnimatedCounter';

interface SummaryCardsProps {
  summary: FinancialSummary;
  onOpenBudgets: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, onOpenBudgets }) => {
  const isPositiveBalance = summary.netBalance >= 0;
  const isBudgetWarning = summary.budgetPercentageUsed >= 90;
  const isBudgetExceeded = summary.budgetPercentageUsed > 100;
  const remainingBudget = Math.max(0, summary.totalBudgetLimit - summary.totalExpense);

  // Income commitment percentage
  const incomeCommitmentRate = summary.totalIncome > 0 
    ? (summary.totalExpense / summary.totalIncome) * 100 
    : 0;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. RECEITAS TOTAIS */}
      <div 
        id="card-summary-income"
        className="relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Receitas Totais
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono-num tracking-tight">
            <AnimatedCounter value={summary.totalIncome} />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Entradas ativas
          </span>
          <span className="font-mono-num text-[11px] text-slate-600 dark:text-slate-300">
            {summary.totalIncome > 0 ? 'Fluxo positivo' : 'Nenhuma entrada'}
          </span>
        </div>
      </div>

      {/* 2. TOTAL DE GASTOS */}
      <div 
        id="card-summary-expenses"
        className="relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total de Gastos
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono-num tracking-tight">
            <AnimatedCounter value={summary.totalExpense} />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-semibold">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Despesas já pagas">
            <CheckCircle2 className="w-3 h-3" />
            Pagas: {formatCurrency(summary.paidExpense)}
          </span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title="Despesas pendentes">
            <Clock className="w-3 h-3" />
            Pendentes: {formatCurrency(summary.pendingExpense)}
          </span>
        </div>
      </div>

      {/* 3. SALDO LÍQUIDO (HERO CARD COM SPARKLINE EXECUTIVO) */}
      <div 
        id="card-summary-balance"
        className={`relative overflow-hidden rounded-2xl p-5 border shadow-xs hover:border-slate-400 dark:hover:border-slate-600 transition-all flex flex-col justify-between group ${
          isPositiveBalance
            ? 'bg-gradient-to-br from-white via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 border-emerald-500/30'
            : 'bg-gradient-to-br from-white via-white to-rose-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/20 border-rose-500/30'
        }`}
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saldo Líquido
            </span>

            {/* Embedded Executive Sparkline */}
            <div className="flex items-center gap-2">
              <svg className="w-14 h-5 overflow-visible" viewBox="0 0 50 16">
                <defs>
                  <linearGradient id="balanceSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color={isPositiveBalance ? "#10b981" : "#f43f5e"} stop-opacity="0.3" />
                    <stop offset="100%" stop-color={isPositiveBalance ? "#10b981" : "#f43f5e"} stop-opacity="0.0" />
                  </linearGradient>
                </defs>
                <path 
                  d={isPositiveBalance ? "M0,13 Q15,10 25,11 T38,4 T50,2 L50,16 L0,16 Z" : "M0,3 Q15,6 25,5 T38,12 T50,14 L50,16 L0,16 Z"} 
                  fill="url(#balanceSparkGrad)" 
                />
                <path 
                  d={isPositiveBalance ? "M0,13 Q15,10 25,11 T38,4 T50,2" : "M0,3 Q15,6 25,5 T38,12 T50,14"} 
                  fill="none" 
                  stroke={isPositiveBalance ? "#10b981" : "#f43f5e"} 
                  strokeWidth="1.75" 
                  strokeLinecap="round" 
                />
                <circle cx="50" cy={isPositiveBalance ? 2 : 14} r="2.5" fill={isPositiveBalance ? "#10b981" : "#f43f5e"} />
              </svg>
            </div>
          </div>
          
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight ${
            isPositiveBalance ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            <AnimatedCounter value={summary.netBalance} />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Taxa de Poupança:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono-num bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px] border border-slate-200/60 dark:border-slate-700/60">
            {summary.savingsRate.toFixed(1)}% poupado
          </span>
        </div>
      </div>

      {/* 4. TETO ORÇAMENTÁRIO & EXECUÇÃO */}
      <div 
        id="card-summary-budget"
        className="relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
      >
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Teto Orçamentário
            </span>
            <button
              onClick={onOpenBudgets}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5"
            >
              Ajustar
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {summary.totalBudgetLimit > 0 ? (
            <>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono-num tracking-tight">
                  {summary.budgetPercentageUsed.toFixed(0)}%
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1.5 font-sans">consumido</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-num font-semibold">
                  Teto: {formatCurrency(summary.totalBudgetLimit)}
                </span>
              </div>

              {/* Precision Executive Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    isBudgetExceeded 
                      ? 'bg-rose-500' 
                      : isBudgetWarning 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, summary.budgetPercentageUsed)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="py-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Nenhum limite estipulado para este mês.
              </p>
              <button
                onClick={onOpenBudgets}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                Definir teto por categoria
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {summary.totalBudgetLimit > 0 ? (
            isBudgetExceeded ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                Excedeu {formatCurrency(summary.totalExpense - summary.totalBudgetLimit)}
              </span>
            ) : (
              <span className="text-[11px]">
                Disponível: <strong className="text-slate-800 dark:text-slate-200 font-mono-num font-bold">{formatCurrency(remainingBudget)}</strong>
              </span>
            )
          ) : (
            <span className="text-[11px] text-slate-400">Controle de metas mensais</span>
          )}
        </div>

      </div>

    </section>
  );
};
