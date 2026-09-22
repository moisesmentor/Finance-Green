import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target, 
  AlertCircle,
  CheckCircle2,
  Clock
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
        className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Receitas Totais
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        
        <div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono-num tracking-tight">
            {formatCurrency(summary.totalIncome)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Entradas registradas no mês
          </div>
        </div>
      </div>

      {/* 2. Despesas Totais */}
      <div 
        id="card-summary-expenses"
        className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total de Gastos
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-800">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        
        <div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 font-mono-num tracking-tight">
            {formatCurrency(summary.totalExpense)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium border-t border-slate-100 dark:border-slate-800 pt-2">
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

      {/* 3. Saldo Líquido */}
      <div 
        id="card-summary-balance"
        className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Saldo do Mês
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
            isPositiveBalance 
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' 
              : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'
          }`}>
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        
        <div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono-num tracking-tight ${
            isPositiveBalance ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(summary.netBalance)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Poupança estimada:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono-num">
              {summary.savingsRate.toFixed(1)}% da receita
            </span>
          </div>
        </div>
      </div>

      {/* 4. Orçamento e Metas */}
      <div 
        id="card-summary-budget"
        className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Teto Orçamentário
          </span>
          <button
            onClick={onOpenBudgets}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline font-medium cursor-pointer"
          >
            Ajustar
          </button>
        </div>

        <div>
          {summary.totalBudgetLimit > 0 ? (
            <>
              <div className="flex items-baseline justify-between">
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono-num tracking-tight">
                  {summary.budgetPercentageUsed.toFixed(0)}%
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">consumido</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                  Limite: {formatCurrency(summary.totalBudgetLimit)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    isBudgetExceeded 
                      ? 'bg-rose-500' 
                      : isBudgetWarning 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, summary.budgetPercentageUsed)}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                {isBudgetExceeded ? (
                  <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Estourou em {formatCurrency(summary.totalExpense - summary.totalBudgetLimit)}
                  </span>
                ) : (
                  <span>
                    Restam: <strong className="text-slate-700 dark:text-slate-200 font-mono-num">{formatCurrency(remainingBudget)}</strong>
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="py-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Nenhum teto de gastos configurado para este mês.</p>
              <button
                onClick={onOpenBudgets}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                Definir limites por categoria
              </button>
            </div>
          )}
        </div>

      </div>

    </section>
  );
};
