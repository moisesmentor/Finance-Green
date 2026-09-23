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
  Moon,
  Sparkles,
  Smartphone,
  RefreshCw
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
  onOpenFirebaseSync: () => void;
  firebaseStatus: 'connected' | 'syncing' | 'offline' | 'unconfigured' | 'error';
  syncKey: string;
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
  onOpenFirebaseSync,
  firebaseStatus,
  syncKey,
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
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/70 dark:border-slate-800/70 shadow-xs transition-all no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Brand & Mobile Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/10">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Finance
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-500" /> Pro
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Gestão Inteligente & Planejamento Financeiro
                </p>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex lg:hidden items-center gap-1.5">
              <button
                onClick={onOpenFirebaseSync}
                className={`p-2 rounded-xl border transition-colors cursor-pointer relative ${
                  firebaseStatus === 'connected'
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
                title="Sincronização em Tempo Real (Desktop ↔ Mobile)"
              >
                <Smartphone className="w-4 h-4" />
                {firebaseStatus === 'connected' && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
              <button
                onClick={onToggleTheme}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Alternar Tema"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                id="btn-new-transaction-mobile"
                onClick={onOpenNewTransaction}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-transform cursor-pointer"
                title="Nova Transação"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Month Capsule Selector */}
          <div className="flex items-center justify-between sm:justify-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer hover:shadow-xs"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{getMonthLabel(period.year, period.month)}</span>
            </div>

            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer hover:shadow-xs"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isCurrent && (
              <button
                id="btn-today-month"
                onClick={handleCurrentMonth}
                className="ml-1 px-2.5 py-1 text-[11px] font-semibold rounded-xl bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-600 hover:bg-emerald-50 dark:hover:bg-slate-600 transition-colors shadow-xs cursor-pointer"
              >
                Hoje
              </button>
            )}
          </div>

          {/* Action Navigation Pill Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            <button
              id="btn-open-goals"
              onClick={onOpenGoals}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer active:scale-95"
              title="Metas e Cofrinhos"
            >
              <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Metas</span>
            </button>

            <button
              id="btn-open-annual"
              onClick={onOpenAnnualReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer active:scale-95"
              title="Visão Anual e Relatórios"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Anual</span>
            </button>

            <button
              id="btn-open-budgets"
              onClick={onOpenBudgets}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-400 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer active:scale-95"
              title="Limites de Gastos por Categoria"
            >
              <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Orçamentos</span>
            </button>

            <button
              id="btn-open-firebase-sync"
              onClick={onOpenFirebaseSync}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer active:scale-95 ${
                firebaseStatus === 'connected'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : firebaseStatus === 'syncing'
                  ? 'bg-amber-50/80 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700'
              }`}
              title="Sincronização Desktop ↔ Mobile (Firebase)"
            >
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{firebaseStatus === 'connected' ? 'Sincronizado' : 'Conectar Celular'}</span>
              {firebaseStatus === 'connected' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ) : firebaseStatus === 'syncing' ? (
                <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
              ) : null}
            </button>

            <button
              id="btn-open-cloud"
              onClick={onOpenCloud}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-700 dark:hover:text-sky-400 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer active:scale-95"
              title="Sincronização em Nuvem (Supabase)"
            >
              <Cloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Nuvem</span>
            </button>

            <button
              id="btn-open-backup"
              onClick={onOpenBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer active:scale-95"
              title="Backup e Dados"
            >
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Backup</span>
            </button>

            {/* Dark Mode Toggle Desktop */}
            <button
              onClick={onToggleTheme}
              className="hidden lg:inline-flex items-center justify-center p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer active:scale-95"
              title="Alternar Tema Claro/Escuro"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* New Transaction CTA Button */}
            <button
              id="btn-new-transaction-desktop"
              onClick={onOpenNewTransaction}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
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
