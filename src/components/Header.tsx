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
  BellRing,
  Building2,
  FileSpreadsheet,
  Crown,
  CreditCard
} from 'lucide-react';
import { MonthPeriod, PlanTier, SubscriptionStatus, ThemeMode, UserProfile } from '../types';
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
  onOpenBankAccounts?: () => void;
  onOpenAnnualReport: () => void;
  onOpenCloud?: () => void;
  onOpenFirebaseSync?: () => void;
  onOpenConnectedBanks?: () => void;
  connectedBanksCount?: number;
  onOpenImportStatement?: () => void;
  onOpenSubscription?: () => void;
  effectivePlan?: PlanTier;
  subscriptionStatus?: SubscriptionStatus;
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
  onOpenBankAccounts,
  onOpenAnnualReport,
  onOpenCloud,
  onOpenConnectedBanks,
  connectedBanksCount = 0,
  onOpenImportStatement,
  onOpenSubscription,
  effectivePlan = 'free',
  subscriptionStatus = 'none',
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 border-b border-slate-100 dark:border-white/5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          
          {/* 1.1 Left: Logo & App Title */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Finance
            </span>
            <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-md">
              PRO
            </span>
          </div>

          {/* 1.2 Center: Clean Month Capsule Selector */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-slate-200/80 dark:border-white/10 shadow-xs">
              <button
                id="btn-prev-month"
                onClick={handlePrevMonth}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 sm:px-3 text-slate-800 dark:text-zinc-100 font-bold text-xs sm:text-sm select-none whitespace-nowrap">
                {getMonthLabel(period.year, period.month)}
              </span>

              <button
                id="btn-next-month"
                onClick={handleNextMonth}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {!isCurrent && (
                <button
                  id="btn-today-month"
                  onClick={handleCurrentMonth}
                  className="ml-1 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap"
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
                className="relative p-1.5 sm:p-2 rounded-full text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 active:scale-95 transition-transform cursor-pointer"
                title={`${urgentAlertsCount} conta(s) a vencer ou atrasada(s)`}
              >
                <BellRing className="w-4 h-4 animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
                  {urgentAlertsCount > 9 ? '9+' : urgentAlertsCount}
                </span>
              </button>
            )}

            {/* User Capsule Pill Trigger */}
            {user && (
              <button
                id="btn-user-menu-trigger"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-xs transition-all cursor-pointer active:scale-95 group text-xs font-semibold text-slate-700 dark:text-zinc-200"
                aria-expanded={isUserMenuOpen}
                title={`Conta: ${user.email}`}
              >
                <span 
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    firebaseStatus === 'connected' ? 'bg-emerald-500' : firebaseStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span className="max-w-[130px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <span className="text-slate-300 dark:text-zinc-600">·</span>
                <span className="text-slate-500 dark:text-zinc-400 font-medium">
                  {firebaseStatus === 'connected' ? 'Sincronizado' : firebaseStatus === 'syncing' ? 'Sincronizando' : 'Offline'}
                </span>
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
                  {/* Minha Assinatura */}
                  {onOpenSubscription && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSubscription();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        {effectivePlan === 'pro' ? (
                          <Crown className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        <span>Minha Assinatura</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                          subscriptionStatus === 'past_due'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : effectivePlan === 'pro'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : effectivePlan === 'basic'
                            ? 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30'
                            : 'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-transparent'
                        }`}
                      >
                        {subscriptionStatus === 'past_due'
                          ? 'Atraso'
                          : effectivePlan === 'pro'
                          ? 'PRO'
                          : effectivePlan === 'basic'
                          ? 'BASIC'
                          : 'Grátis'}
                      </span>
                    </button>
                  )}

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

                  {/* Bancos Conectados (Open Finance / Pluggy) */}
                  {onOpenConnectedBanks && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenConnectedBanks();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Bancos Conectados</span>
                      </div>
                      {connectedBanksCount > 0 ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {connectedBanksCount}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                          Open Finance
                        </span>
                      )}
                    </button>
                  )}

                  {/* Importar Extrato Bancário (OFX / CSV) */}
                  {onOpenImportStatement && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenImportStatement();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Importar Extrato</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        OFX / CSV
                      </span>
                    </button>
                  )}


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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          
          {/* 2.1 Horizontal Tabs Pill Group */}
          <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0 text-xs sm:text-sm font-semibold">
            
            {/* Tab: Dashboard */}
            <button
              onClick={() => setActiveTab(null)}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTab === null
                  ? 'bg-[#059669] text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 font-medium'
              }`}
            >
              Dashboard
            </button>

            {/* Tab: Bancos */}
            <button
              id="btn-open-banks"
              onClick={() => {
                setActiveTab('banks');
                if (onOpenBankAccounts) onOpenBankAccounts();
              }}
              className={`px-3.5 py-2 rounded-full transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'banks'
                  ? 'bg-[#059669] text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 font-medium'
              }`}
              title="Saldo em Bancos e Carteiras"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Bancos</span>
            </button>

            {/* Tab: Reserva */}
            <button
              id="btn-open-reserve"
              onClick={() => {
                setActiveTab('reserve');
                (onOpenReserve || onOpenGoals)();
              }}
              className={`px-3.5 py-2 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'reserve'
                  ? 'bg-[#059669] text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 font-medium'
              }`}
              title="Caixa de Reserva de Emergência"
            >
              Reserva
            </button>

            {/* Tab: Patrimônio */}
            <button
              id="btn-open-investments"
              onClick={() => {
                setActiveTab('investments');
                if (onOpenInvestments) onOpenInvestments();
              }}
              className={`px-3.5 py-2 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'investments'
                  ? 'bg-[#059669] text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 font-medium'
              }`}
              title="Investimentos e Patrimônio Consolidado"
            >
              Patrimônio
            </button>

            {/* Tab: Metas */}
            <button
              id="btn-open-goals"
              onClick={() => {
                setActiveTab('goals');
                onOpenGoals();
              }}
              className={`px-3.5 py-2 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'goals'
                  ? 'bg-[#059669] text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 font-medium'
              }`}
              title="Metas e Cofrinhos"
            >
              Metas
            </button>

            {/* Tab: Anual */}
            <button
              id="btn-open-annual"
              onClick={() => {
                setActiveTab('annual');
                onOpenAnnualReport();
              }}
              className={`px-3.5 py-2 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'annual'
                  ? 'bg-[#059669] text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 font-medium'
              }`}
              title="Demonstrativo Anual"
            >
              Anual
            </button>

            {/* Tab: Orçamentos */}
            <button
              id="btn-open-budgets"
              onClick={() => {
                setActiveTab('budgets');
                onOpenBudgets();
              }}
              className={`px-3.5 py-2 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'budgets'
                  ? 'bg-[#059669] text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 font-medium'
              }`}
              title="Planejamento de Orçamentos"
            >
              Orçamentos
            </button>

          </nav>

          {/* 2.2 Right: Fixed "Novo Lançamento" CTA Button */}
          <div className="w-full sm:w-auto shrink-0 flex items-center justify-end">
            <button
              id="btn-new-transaction"
              onClick={onOpenNewTransaction}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#047857] hover:bg-[#065f46] text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              title="Criar Novo Lançamento"
            >
              <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
              <span>Novo Lançamento</span>
            </button>
          </div>

        </div>
      </div>

    </header>
  );
};
