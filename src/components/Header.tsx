import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Plus, 
  Target, 
  Download, 
  RotateCcw,
  Wallet
} from 'lucide-react';
import { MonthPeriod } from '../types';
import { getMonthLabel, isCurrentMonth } from '../utils/formatters';

interface HeaderProps {
  period: MonthPeriod;
  onPeriodChange: (period: MonthPeriod) => void;
  onOpenNewTransaction: () => void;
  onOpenBudgets: () => void;
  onOpenBackup: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  period,
  onPeriodChange,
  onOpenNewTransaction,
  onOpenBudgets,
  onOpenBackup,
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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & App Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-200">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Finanças Mensais
                  <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Controle de Gastos
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Organize despesas, planeje seu mês e acompanhe suas metas
                </p>
              </div>
            </div>

            {/* Mobile Actions Button */}
            <div className="flex md:hidden items-center gap-1.5">
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
          <div className="flex items-center justify-between sm:justify-center gap-2 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors shadow-none hover:shadow-xs"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2 text-slate-800 font-semibold text-sm sm:text-base">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{getMonthLabel(period.year, period.month)}</span>
            </div>

            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors shadow-none hover:shadow-xs"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isCurrent && (
              <button
                id="btn-today-month"
                onClick={handleCurrentMonth}
                className="ml-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white text-emerald-700 border border-slate-200 hover:bg-emerald-50 transition-colors shadow-xs"
              >
                Mês atual
              </button>
            )}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button
              id="btn-open-budgets"
              onClick={onOpenBudgets}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors"
            >
              <Target className="w-4 h-4 text-slate-600" />
              Metas de Gastos
            </button>

            <button
              id="btn-open-backup"
              onClick={onOpenBackup}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors"
              title="Backup e Dados"
            >
              <Download className="w-4 h-4 text-slate-600" />
              Backup
            </button>

            <button
              id="btn-new-transaction-desktop"
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs active:scale-[0.98] transition-all"
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
