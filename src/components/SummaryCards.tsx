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
  ArrowDownRight
} from 'lucide-react';
import { FinancialSummary } from '../types';
import { formatCurrency } from '../utils/formatters';

interface SummaryCardsProps {
  summary: FinancialSummary;
  onOpenBudgets: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, onOpenBudgets }) => {
  const isPositiveBalance = summary.netBalance >= 0;
  const isBudgetWarning = summary.budgetPercentageUsed >= 90;
  const isBudgetExceeded = summary.budgetPercentageUsed > 100;
  const remainingBudget = Math.max(0, summary.totalBudgetLimit - summary.totalExpense);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Receitas Totais */}
      <div 
        id="card-summary-income"
        className="relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all flex flex-col justify-between group"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/15 transition-all" />

        <div className="flex items-center justify-between mb-3 relative">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Receitas Totais
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        
        <div className="relative">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono-num tracking-tight">
            {formatCurrency(summary.totalIncome)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Entradas deste mês
          </div>
        </div>
      </div>

      {/* 2. Despesas Totais */}
      <div 
        id="card-summary-expenses"
        className="relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md hover:border-rose-500/40 dark:hover:border-rose-500/30 transition-all flex flex-col justify-between group"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/15 transition-all" />

        <div className="flex items-center justify-between mb-3 relative">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total de Gastos
          </span>
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-xs">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        
        <div className="relative">
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono-num tracking-tight">
            {formatCurrency(summary.totalExpense)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Despesas já pagas">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Pagas: {formatCurrency(summary.paidExpense)}
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title="Despesas pendentes">
              <Clock className="w-3.5 h-3.5" />
              Pendentes: {formatCurrency(summary.pendingExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Saldo Líquido (Destaque Principal) */}
      <div 
        id="card-summary-balance"
        className={`relative overflow-hidden rounded-2xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
          isPositiveBalance
            ? 'bg-gradient-to-br from-white via-white to-emerald-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-emerald-500/30 hover:border-emerald-500/50'
            : 'bg-gradient-to-br from-white via-white to-rose-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/30 border-rose-500/30 hover:border-rose-500/50'
        }`}
      >
        <div className="flex items-center justify-between mb-3 relative">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Saldo Líquido
          </span>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
            isPositiveBalance 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          }`}>
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        
        <div className="relative">
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight ${
            isPositiveBalance ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(summary.netBalance)}
          </div>
          <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Taxa de Poupança:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono-num bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[11px]">
              {summary.savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* 4. Orçamento & Teto de Gastos */}
      <div 
        id="card-summary-budget"
        className="relative overflow-hidden bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md hover:border-amber-500/40 dark:hover:border-amber-500/30 transition-all flex flex-col justify-between group"
      >
        <div className="flex items-center justify-between mb-3 relative">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Teto Orçamentário
          </span>
          <button
            onClick={onOpenBudgets}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
          >
            Ajustar
          </button>
        </div>

        <div className="relative">
          {summary.totalBudgetLimit > 0 ? (
            <>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono-num tracking-tight">
                  {summary.budgetPercentageUsed.toFixed(0)}%
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1.5 font-sans">consumido</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-num font-semibold">
                  Teto: {formatCurrency(summary.totalBudgetLimit)}
                </span>
              </div>

              {/* Enhanced Pill Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mt-2.5 p-0.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isBudgetExceeded 
                      ? 'bg-rose-500' 
                      : isBudgetWarning 
                        ? 'bg-amber-500' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${Math.min(100, summary.budgetPercentageUsed)}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                {isBudgetExceeded ? (
                  <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Excedeu em {formatCurrency(summary.totalExpense - summary.totalBudgetLimit)}
                  </span>
                ) : (
                  <span>
                    Disponível: <strong className="text-slate-800 dark:text-slate-200 font-mono-num font-bold">{formatCurrency(remainingBudget)}</strong>
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="py-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                Nenhum limite estipulado para este mês.
              </p>
              <button
                onClick={onOpenBudgets}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                Definir teto por categoria
              </button>
            </div>
          )}
        </div>

      </div>

    </section>
  );
};
