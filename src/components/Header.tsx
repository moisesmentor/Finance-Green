import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Plus, 
  Target, 
  Download, 
  Wallet,
  PiggyBank,
  BarChart3,
  Cloud,
  Sun,
  Moon
} from 'lucide-react';
import { MonthPeriod, ThemeMode } from '../types';
import { getMonthLabel, isCurrentMonth } from '../utils/formatters';

interface HeaderProps {
  period: MonthPeriod;
  onPeriodChange: (period: MonthPeriod) => void;
  onOpenNewTransaction: () => void;
  onOpenBudgets: () => void;
  onOpenBackup: () => void;
  onOpenGoals: () => void;
  onOpenAnnualReport: () => void;
  onOpenCloud: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  period,
  onPeriodChange,
  onOpenNewTransaction,
  onOpenBudgets,
  onOpenBackup,
  onOpenGoals,
  onOpenAnnualReport,
  onOpenCloud,
  theme,
  onToggleTheme,
}) => {
  const handlePrevMonth = () => {
    if (period.month === 0) {
      onPeriodChange({ year: period.year - 1, month: 11 });
    } else {
      onPeriodChange({ year: period.year, month: period.month - 1 });
    }
  };

  const handleNextMonth = () => {
    if (period.month === 11) {
      onPeriodChange({ year: period.year + 1, month: 0 });
    } else {
      onPeriodChange({ year: period.year, month: period.month + 1 });
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onPeriodChange({ year: now.getFullYear(), month: now.getMonth() });
  };

  const isCurrent = isCurrentMonth(period.year, period.month);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Logo & App Title & Mobile Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-200 dark:shadow-none">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  Finanças Mensais
                  <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Controle Inteligente
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Organize despesas, parcelamentos, metas e sincronize na nuvem
                </p>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex lg:hidden items-center gap-1.5">
              <button
                onClick={onToggleTheme}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Alternar Tema"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                id="btn-new-transaction-mobile"
                onClick={onOpenNewTransaction}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white shadow-sm active:scale-95 transition-transform"
                title="Nova Transação"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Month Selector Bar */}
          <div className="flex items-center justify-between sm:justify-center gap-2 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2 text-slate-800 dark:text-slate-200 font-semibold text-sm sm:text-base">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{getMonthLabel(period.year, period.month)}</span>
            </div>

            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isCurrent && (
              <button
                id="btn-today-month"
                onClick={handleCurrentMonth}
                className="ml-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-600 hover:bg-emerald-50 dark:hover:bg-slate-600 transition-colors shadow-xs cursor-pointer"
              >
                Mês atual
              </button>
            )}
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end">
            <button
              id="btn-open-goals"
              onClick={onOpenGoals}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Metas e Cofrinhos"
            >
              <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Metas</span>
            </button>

            <button
              id="btn-open-annual"
              onClick={onOpenAnnualReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Visão Anual e Relatórios"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Anual</span>
            </button>

            <button
              id="btn-open-budgets"
              onClick={onOpenBudgets}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Limites de Gastos por Categoria"
            >
              <Target className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Orçamentos</span>
            </button>

            <button
              id="btn-open-cloud"
              onClick={onOpenCloud}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Sincronização em Nuvem (Supabase)"
            >
              <Cloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Nuvem</span>
            </button>

            <button
              id="btn-open-backup"
              onClick={onOpenBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Backup e Dados"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Backup</span>
            </button>

            {/* Dark Mode Toggle Desktop */}
            <button
              onClick={onToggleTheme}
              className="hidden lg:inline-flex items-center justify-center p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Alternar Tema Claro/Escuro"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              id="btn-new-transaction-desktop"
              onClick={onOpenNewTransaction}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Transação
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
