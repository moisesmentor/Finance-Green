import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Calendar, 
  Plus, 
  Target, 
  Download, 
  Wallet, 
  BarChart3, 
  Cloud, 
  Sun, 
  Moon, 
  Sparkles, 
  LogOut, 
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
  firebaseStatus,
  theme,
  onToggleTheme,
  user,
  onLogout,
  urgentAlertsCount = 0,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

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
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/95 dark:bg-[#121214] border-b border-slate-200/80 dark:border-white/10 shadow-xs transition-all duration-300 no-print">
      
      {/* =================================================================== */}
      {/* LAYER 1: BRAND, CENTERED MONTH SELECTOR, ALERTS & USER MENU */}
      {/* =================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* 1.1 Left: Logo & App Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs dark:shadow-[0_0_20px_-3px_rgba(16,185,129,0.45)]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                  Finance
                </h1>
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/40">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-500" /> Pro
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-1">
                Gestão Patrimonial & Finanças
              </p>
            </div>
          </div>

          {/* 1.2 Center: Month Capsule Selector */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100/90 dark:bg-black/50 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <button
                id="btn-prev-month"
                onClick={handlePrevMonth}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm select-none">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="whitespace-nowrap">{getMonthLabel(period.year, period.month)}</span>
              </div>

              <button
                id="btn-next-month"
                onClick={handleNextMonth}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {!isCurrent && (
                <button
                  id="btn-today-month"
                  onClick={handleCurrentMonth}
                  className="ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                >
                  Hoje
                </button>
              )}
            </div>
          </div>

          {/* 1.3 Right: Alerts & User Menu Dropdown */}
          <div className="relative shrink-0 flex items-center gap-2" ref={userMenuRef}>
            
            {/* Urgent Alerts Count */}
            {urgentAlertsCount > 0 && (
              <button
                id="btn-due-alerts-bell"
                onClick={scrollToAlerts}
                className="relative p-1.5 sm:p-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 active:scale-95 transition-transform cursor-pointer"
                title={`${urgentAlertsCount} conta(s) a vencer ou atrasada(s)`}
              >
                <BellRing className="w-4 h-4 animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
                  {urgentAlertsCount > 9 ? '9+' : urgentAlertsCount}
                </span>
              </button>
            )}

            {/* User Chip Trigger */}
            {user && (
              <button
                id="btn-user-menu-trigger"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-black/40 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer active:scale-95 group"
                aria-expanded={isUserMenuOpen}
                title={`Conta: ${user.email}`}
              >
                <div 
                  className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs uppercase shadow-xs select-none shrink-0"
                >
                  {user.displayName ? user.displayName.charAt(0) : (user.email ? user.email.charAt(0) : 'U')}
                  <span 
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-[#121214] ${
                      firebaseStatus === 'connected' ? 'bg-emerald-500' : firebaseStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                </div>
                
                <div className="hidden sm:flex flex-col text-left">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs max-w-[120px] truncate leading-tight">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[120px] truncate leading-tight">
                    {firebaseStatus === 'connected' ? 'Sincronizado' : firebaseStatus === 'syncing' ? 'Sincronizando...' : 'Offline'}
                  </span>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* DROPDOWN MENU POPOVER */}
            {isUserMenuOpen && (
              <div 
                id="user-dropdown-menu"
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-[#161619] border border-slate-200/90 dark:border-white/10 shadow-2xl z-50 p-2 text-slate-800 dark:text-slate-200 transition-all duration-200 animate-in fade-in zoom-in-95"
              >
                {/* User Info Header */}
                {user && (
                  <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1a1a1e] border border-slate-100 dark:border-white/5 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                        {user.displayName ? user.displayName.charAt(0) : (user.email ? user.email.charAt(0) : 'U')}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user.displayName || user.email?.split('@')[0]}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span className={`w-1.5 h-1.5 rounded-full ${firebaseStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        {firebaseStatus === 'connected' ? 'Firebase Nuvem OK' : firebaseStatus === 'syncing' ? 'Sincronizando' : 'Modo Local'}
                      </span>
                      {user.uid && (
                        <span className="text-slate-400 font-mono text-[9px]">
                          UID: {user.uid.slice(0, 5)}...
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Dropdown Menu Items */}
                <div className="space-y-1">
                  {/* Theme Mode Switch */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleTheme();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Moon className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      {theme === 'dark' ? 'Escuro' : 'Claro'}
                    </span>
                  </button>

                  {/* Backup & Import/Export */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenBackup();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-left"
                  >
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Backup & Sincronização</span>
                  </button>

                  {/* Cloud Config Modal (if configured) */}
                  {onOpenCloud && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenCloud();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-left"
                    >
                      <Cloud className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>Configurações em Nuvem</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* LAYER 2: NAVIGATION TABS & FIXED NEW TRANSACTION CTA */}
      {/* =================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-11 sm:h-12">
          
          {/* 2.1 Horizontal Tabs Navigation with smooth touch scroll */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1 text-xs font-semibold -mb-px">
            
            {/* Tab: Reserva */}
            <button
              id="btn-open-reserve"
              onClick={() => {
                setActiveTab('reserve');
                (onOpenReserve || onOpenGoals)();
              }}
              className={`group relative inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'reserve'
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              title="Caixa de Reserva de Emergência"
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Reserva</span>
              {activeTab === 'reserve' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>

            {/* Tab: Patrimônio */}
            <button
              id="btn-open-investments"
              onClick={() => {
                setActiveTab('investments');
                if (onOpenInvestments) onOpenInvestments();
              }}
              className={`group relative inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'investments'
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              title="Investimentos e Patrimônio Consolidado"
            >
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Patrimônio</span>
              {activeTab === 'investments' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>

            {/* Tab: Metas */}
            <button
              id="btn-open-goals"
              onClick={() => {
                setActiveTab('goals');
                onOpenGoals();
              }}
              className={`group relative inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'goals'
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              title="Metas e Cofrinhos"
            >
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Metas</span>
              {activeTab === 'goals' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>

            {/* Tab: Anual */}
            <button
              id="btn-open-annual"
              onClick={() => {
                setActiveTab('annual');
                onOpenAnnualReport();
              }}
              className={`group relative inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'annual'
                  ? 'text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-500/10 dark:bg-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              title="Demonstrativo Anual"
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Anual</span>
              {activeTab === 'annual' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>

            {/* Tab: Orçamentos */}
            <button
              id="btn-open-budgets"
              onClick={() => {
                setActiveTab('budgets');
                onOpenBudgets();
              }}
              className={`group relative inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'budgets'
                  ? 'text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 dark:bg-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              title="Planejamento de Orçamentos"
            >
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Orçamentos</span>
              {activeTab === 'budgets' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-500 rounded-full" />
              )}
            </button>

          </nav>

          {/* 2.2 Right: Fixed "Novo Lançamento" CTA Button */}
          <div className="shrink-0 flex items-center">
            <button
              id="btn-new-transaction"
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-md dark:shadow-[0_0_20px_-3px_rgba(16,185,129,0.45)] cursor-pointer"
              title="Criar Novo Lançamento"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>

        </div>
      </div>

    </header>
  );
};
