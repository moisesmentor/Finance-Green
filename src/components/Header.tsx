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
  RefreshCw, 
  LogOut, 
  User as UserIcon,
  ShieldCheck,
  TrendingUp,
  BellRing
} from 'lucide-react';
import { MonthPeriod, ThemeMode, UserProfile } from '../types';
import { getMonthLabel, isCurrentMonth } from '../utils/formatters';

interface HeaderProps {
  period: MonthPeriod;
  onPeriodChange: (period: MonthPeriod) => void;
  onOpenNewTransaction: () => void;
  onOpenBudgets: () => void;
  onOpenBackup: () => void;
  onOpenGoals: () => void;
  onOpenReserve?: () => void;
  onOpenInvestments?: () => void;
  onOpenAnnualReport: () => void;
  onOpenCloud?: () => void;
  onOpenFirebaseSync?: () => void;
  firebaseStatus: 'connected' | 'syncing' | 'offline' | 'unconfigured' | 'error';
  syncKey?: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  user: UserProfile | null;
  onLogout: () => void;
  urgentAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  period,
  onPeriodChange,
  onOpenNewTransaction,
  onOpenBudgets,
  onOpenBackup,
  onOpenGoals,
  onOpenReserve,
  onOpenInvestments,
  onOpenAnnualReport,
  onOpenCloud,
  onOpenFirebaseSync,
  firebaseStatus,
  syncKey,
  theme,
  onToggleTheme,
  user,
  onLogout,
  urgentAlertsCount = 0,
}) => {
  const scrollToAlerts = () => {
    const el = document.getElementById('due-alerts-banner');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/90 dark-brushed-metal-header border-b border-slate-200/80 shadow-xs transition-all duration-300 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Brand & Mobile Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs dark:shadow-[0_0_20px_-3px_rgba(16,185,129,0.45)]">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Finance
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/40 dark:shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-500" /> Pro
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Gestão Patrimonial & Finanças
                </p>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex lg:hidden items-center gap-1.5">
              {urgentAlertsCount > 0 && (
                <button
                  onClick={scrollToAlerts}
                  className="relative p-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 active:scale-95 transition-transform cursor-pointer"
                  title={`${urgentAlertsCount} conta(s) a vencer ou atrasada(s)`}
                >
                  <BellRing className="w-4 h-4 animate-bounce" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
                    {urgentAlertsCount > 9 ? '9+' : urgentAlertsCount}
                  </span>
                </button>
              )}
              <button
                onClick={onToggleTheme}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Alternar Tema"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              {user && (
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title={`Sair da conta (${user.email})`}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
              <button
                id="btn-new-transaction-mobile"
                onClick={onOpenNewTransaction}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 text-white shadow-xs active:scale-95 transition-transform cursor-pointer"
                title="Nova Transação"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Month Capsule Selector */}
          <div className="flex items-center justify-between sm:justify-center gap-1 bg-slate-100/90 dark:bg-black/50 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-inner">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
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
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isCurrent && (
              <button
                id="btn-today-month"
                onClick={handleCurrentMonth}
                className="ml-1 px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
              >
                Hoje
              </button>
            )}
          </div>

          {/* Action Navigation Pill Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {urgentAlertsCount > 0 && (
              <button
                id="btn-due-alerts-bell"
                onClick={scrollToAlerts}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 transition-all cursor-pointer active:scale-95 animate-pulse dark:shadow-[0_0_18px_-3px_rgba(244,63,94,0.45)]"
                title={`${urgentAlertsCount} conta(s) com vencimento próximo ou atrasada(s)`}
              >
                <BellRing className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Vencimentos</span>
                <span className="flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                  {urgentAlertsCount}
                </span>
              </button>
            )}

            <button
              id="btn-open-reserve"
              onClick={onOpenReserve || onOpenGoals}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-black/40 hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-white/10 dark:hover:border-white/20 transition-all cursor-pointer active:scale-95"
              title="Caixa de Reserva de Emergência"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Reserva</span>
            </button>

            <button
              id="btn-open-investments"
              onClick={onOpenInvestments}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-black/40 hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-white/10 dark:hover:border-white/20 transition-all cursor-pointer active:scale-95"
              title="Investimentos e Patrimônio Consolidado"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Patrimônio</span>
            </button>

            <button
              id="btn-open-goals"
              onClick={onOpenGoals}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-black/40 hover:bg-emerald-50 dark:hover:bg-white/10 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-white/10 dark:hover:border-white/20 transition-all cursor-pointer active:scale-95"
              title="Metas e Cofrinhos"
            >
              <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Metas</span>
            </button>

            <button
              id="btn-open-annual"
              onClick={onOpenAnnualReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-black/40 hover:bg-indigo-50 dark:hover:bg-white/10 hover:text-indigo-700 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-white/10 dark:hover:border-white/20 transition-all cursor-pointer active:scale-95"
              title="Demonstrativo Anual"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Anual</span>
            </button>

            <button
              id="btn-open-budgets"
              onClick={onOpenBudgets}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-black/40 hover:bg-amber-50 dark:hover:bg-white/10 hover:text-amber-700 dark:hover:text-amber-400 border border-slate-200/80 dark:border-white/10 dark:hover:border-white/20 transition-all cursor-pointer active:scale-95"
              title="Planejamento de Orçamentos"
            >
              <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Orçamentos</span>
            </button>

            <button
              id="btn-open-backup"
              onClick={onOpenBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-black/40 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 dark:hover:border-white/20 transition-all cursor-pointer active:scale-95"
              title="Backup e Dados"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Backup</span>
            </button>

            {/* Dark Mode Toggle Desktop */}
            <button
              onClick={onToggleTheme}
              className="hidden lg:inline-flex items-center justify-center p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer active:scale-95"
              title="Alternar Tema Claro/Escuro"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Profile Pill & Logout Desktop */}
            {user && (
              <div className="hidden lg:flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl bg-slate-100/90 dark:bg-black/40 border border-slate-200/80 dark:border-white/10">
                <div 
                  className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs uppercase shadow-xs select-none"
                  title={`Usuário: ${user.email} (${firebaseStatus === 'connected' ? 'Sincronizado' : 'Offline'})`}
                >
                  {user.displayName ? user.displayName.charAt(0) : (user.email ? user.email.charAt(0) : 'U')}
                  <span 
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-slate-900 ${
                      firebaseStatus === 'connected' ? 'bg-emerald-500' : firebaseStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs max-w-[120px] truncate leading-tight">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[120px] truncate leading-tight">
                    {user.email}
                  </span>
                </div>
                <button
                  id="btn-logout-desktop"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Sair da Conta (Logout)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* New Transaction CTA Button */}
            <button
              id="btn-new-transaction-desktop"
              onClick={onOpenNewTransaction}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-xs dark:shadow-[0_0_20px_-3px_rgba(16,185,129,0.45)] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Lançamento
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
