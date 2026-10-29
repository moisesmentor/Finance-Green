import React, { useState, useMemo } from 'react';
import { 
  X, 
  Building2, 
  Plus, 
  TrendingUp, 
  Wallet, 
  Clock, 
  AlertTriangle, 
  Edit2, 
  Trash2, 
  Archive, 
  ArchiveRestore, 
  Check, 
  HelpCircle, 
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  History,
  Banknote,
  Coins,
  Smartphone,
  PiggyBank,
  CircleDollarSign,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { BankAccount, BankAccountType, BankBalanceHistoryEntry, Transaction } from '../types';
import { formatCurrency, formatDateShort } from '../utils/formatters';
import { POPULAR_BANKS_PRESETS } from '../utils/constants';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';

interface BankAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts?: BankAccount[];
  history?: BankBalanceHistoryEntry[];
  onSaveAccount: (account: BankAccount) => Promise<void>;
  onDeleteAccount: (accountId: string) => Promise<void>;
  onSaveHistoryEntry: (entry: BankBalanceHistoryEntry) => Promise<void>;
  onAddTransaction?: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
}

const ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  digital: 'Conta Digital',
  checking: 'Conta Corrente',
  savings: 'Poupança',
  cash: 'Dinheiro Físico / Carteira',
  investment: 'Conta Investimento',
  other: 'Outro',
};

// Ícones pré-definidos para bancos e contas
export const PRESET_ICONS = [
  { id: 'building', label: 'Banco', Icon: Building2 },
  { id: 'wallet', label: 'Carteira', Icon: Wallet },
  { id: 'credit-card', label: 'Cartão', Icon: CreditCard },
  { id: 'banknote', label: 'Dinheiro', Icon: Banknote },
  { id: 'coins', label: 'Moedas', Icon: Coins },
  { id: 'smartphone', label: 'Digital', Icon: Smartphone },
  { id: 'piggy-bank', label: 'Poupança', Icon: PiggyBank },
  { id: 'circle-dollar', label: 'Câmbio', Icon: CircleDollarSign },
];

// Máscara de moeda brasileira: converte dígitos em string formatada "0,00"
export const formatCurrencyMask = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '0,00';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Converte string com máscara BRL para número float
export const parseCurrencyMask = (val: string): number => {
  if (!val) return 0;
  const digits = val.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
};

export const BankAccountsModal: React.FC<BankAccountsModalProps> = ({
  isOpen,
  onClose,
  accounts = [],
  history = [],
  onSaveAccount,
  onDeleteAccount,
  onSaveHistoryEntry,
  onAddTransaction,
}) => {
  // Navigation / Filter Tab
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Submodals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [isUpdateBalanceOpen, setIsUpdateBalanceOpen] = useState(false);
  const [selectedAccountForBalance, setSelectedAccountForBalance] = useState<BankAccount | null>(null);

  // Form State (New / Edit Bank)
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<BankAccountType>('digital');
  const [formBalance, setFormBalance] = useState('0,00');
  const [formColor, setFormColor] = useState('#820AD1');
  const [formIcon, setFormIcon] = useState<string>('building');
  const [formLinkToReserve, setFormLinkToReserve] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Update Balance State
  const [newBalanceStr, setNewBalanceStr] = useState('0,00');
  const [changeType, setChangeType] = useState<'adjustment' | 'deposit' | 'withdraw'>('adjustment');
  const [createTxInStatement, setCreateTxInStatement] = useState(false);
  const [balanceNote, setBalanceNote] = useState('');
  const [balanceError, setBalanceError] = useState('');
  // Confirmação para variação drástica de saldo (evita digitação com zeros a mais/menos)
  const [pendingDrasticBalance, setPendingDrasticBalance] = useState<number | null>(null);

  // Active vs Archived accounts (defensive checks)
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const safeHistory = Array.isArray(history) ? history : [];

  const activeAccounts = safeAccounts.filter(a => !a.isArchived);
  const archivedAccounts = safeAccounts.filter(a => a.isArchived);
  const displayedAccounts = activeTab === 'active' ? activeAccounts : archivedAccounts;

  // Total balance in active accounts
  const totalBalance = activeAccounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);

  // Latest overall update timestamp
  const latestUpdate = activeAccounts.length > 0 
    ? Math.max(...activeAccounts.map(a => Number(a.lastUpdatedAt) || 0))
    : 0;

  // Breakdown by type (always called in the exact same hook order)
  const typeBreakdown = useMemo(() => {
    const map = new Map<BankAccountType, number>();
    for (const a of activeAccounts) {
      const cur = map.get(a.type) || 0;
      map.set(a.type, cur + (Number(a.currentBalance) || 0));
    }
    return Array.from(map.entries()).map(([type, total]) => ({
      type,
      label: ACCOUNT_TYPE_LABELS[type] || 'Outro',
      total,
    }));
  }, [activeAccounts]);

  // Monthly balance history aggregation for the mini-chart (last 6 months - hook always called)
  const monthlyChartData = useMemo(() => {
    const now = new Date();
    const result: { monthLabel: string; total: number; isCurrent: boolean }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthShort = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      if (i === 0) {
        // Current month: use current total balance
        result.push({
          monthLabel: monthShort.charAt(0).toUpperCase() + monthShort.slice(1),
          total: totalBalance,
          isCurrent: true,
        });
      } else {
        // Find latest history snapshot for each account up to the end of that month
        const endOfMonthDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;
        let monthTotal = 0;

        for (const acc of activeAccounts) {
          const accHistory = safeHistory.filter(
            h => h.accountId === acc.id && h.date <= endOfMonthDate
          );
          if (accHistory.length > 0) {
            monthTotal += (Number(accHistory[0].balance) || 0);
          } else {
            monthTotal += (Number(acc.currentBalance) || 0);
          }
        }

        result.push({
          monthLabel: monthShort.charAt(0).toUpperCase() + monthShort.slice(1),
          total: Math.max(0, monthTotal),
          isCurrent: false,
        });
      }
    }

    const maxVal = Math.max(...result.map(r => r.total), 1);
    return result.map(r => ({
      ...r,
      percentage: Math.max(15, Math.round((r.total / maxVal) * 100)),
    }));
  }, [safeHistory, activeAccounts, totalBalance]);

  // Check if an account is outdated (> 30 days)
  const isAccountOutdated = (lastUpdated: number) => {
    if (!lastUpdated) return true;
    const diffDays = Math.floor((Date.now() - lastUpdated) / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  };

  const getDaysAgoText = (lastUpdated: number) => {
    if (!lastUpdated) return 'Nunca atualizado';
    const diffDays = Math.floor((Date.now() - lastUpdated) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    return `Há ${diffDays} dias`;
  };

  // Renderizador do ícone de um banco
  const renderAccountIcon = (account: BankAccount) => {
    const iconMap: Record<string, React.FC<{ className?: string }>> = {
      building: Building2,
      landmark: Building2,
      wallet: Wallet,
      'credit-card': CreditCard,
      banknote: Banknote,
      coins: Coins,
      smartphone: Smartphone,
      'piggy-bank': PiggyBank,
      'circle-dollar': CircleDollarSign,
    };
    const SelectedIcon = account.icon ? iconMap[account.icon] : null;
    if (SelectedIcon) return <SelectedIcon className="w-5 h-5" />;
    if (account.type === 'cash') return <Banknote className="w-5 h-5" />;
    if (account.type === 'savings') return <PiggyBank className="w-5 h-5" />;
    return <span className="font-extrabold text-xs tracking-tight">{(account.name || 'B').substring(0, 3).toUpperCase()}</span>;
  };

  // Open Form for Adding New Bank
  const handleOpenAddForm = () => {
    setEditingAccount(null);
    setFormName('');
    setFormType('digital');
    setFormBalance('0,00');
    setFormColor('#820AD1');
    setFormIcon('building');
    setFormLinkToReserve(false);
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Form for Editing Existing Bank
  const handleOpenEditForm = (account: BankAccount) => {
    setEditingAccount(account);
    setFormName(account.name || '');
    setFormType(account.type || 'digital');
    const balanceNum = typeof account.currentBalance === 'number' ? account.currentBalance : 0;
    setFormBalance(balanceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setFormColor(account.color || '#059669');
    setFormIcon(account.icon || (account.type === 'cash' ? 'banknote' : account.type === 'savings' ? 'piggy-bank' : 'building'));
    setFormLinkToReserve(Boolean(account.linkToReserve));
    setFormError('');
    setIsFormOpen(true);
  };

  // Submit Bank Form (Create / Edit)
  const handleSaveBankForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('Informe o nome do banco ou instituição.');
      return;
    }

    // Check duplicate names (case-insensitive)
    const isDuplicate = safeAccounts.some(
      a => a.name.toLowerCase() === cleanName.toLowerCase() && a.id !== editingAccount?.id
    );
    if (isDuplicate) {
      setFormError(`Já existe uma conta com o nome "${cleanName}". Escolha outro nome.`);
      return;
    }

    const parsedBalance = parseCurrencyMask(formBalance);
    if (isNaN(parsedBalance) || parsedBalance < 0) {
      setFormError('Informe um saldo válido (maior ou igual a zero).');
      return;
    }

    if (parsedBalance > 1000000000) {
      setFormError('O saldo informado ultrapassa o limite permitido.');
      return;
    }

    setIsSaving(true);
    try {
      const accountId = editingAccount ? editingAccount.id : `bank-${Date.now()}`;
      const isNew = !editingAccount;

      const accountData: BankAccount = {
        id: accountId,
        name: cleanName,
        type: formType,
        currentBalance: parsedBalance,
        color: formColor,
        icon: formIcon,
        isArchived: editingAccount?.isArchived || false,
        linkToReserve: formLinkToReserve,
        lastUpdatedAt: Date.now(),
        createdAt: editingAccount?.createdAt || Date.now(),
      };

      await onSaveAccount(accountData);

      // If new account or balance changed, record history entry
      if (isNew || (editingAccount && editingAccount.currentBalance !== parsedBalance)) {
        const prevBal = editingAccount ? (editingAccount.currentBalance || 0) : 0;
        const diff = parsedBalance - prevBal;
        const entry: BankBalanceHistoryEntry = {
          id: `hist-${Date.now()}`,
          accountId: accountData.id,
          accountName: accountData.name,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now(),
          balance: parsedBalance,
          previousBalance: prevBal,
          difference: diff,
          changeType: isNew ? 'adjustment' : (diff >= 0 ? 'deposit' : 'withdraw'),
          note: isNew ? 'Saldo inicial de cadastro' : 'Ajuste manual de cadastro',
        };
        await onSaveHistoryEntry(entry);
      }

      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar conta bancária.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Update Balance Modal
  const handleOpenUpdateBalance = (account: BankAccount) => {
    setSelectedAccountForBalance(account);
    const balanceNum = typeof account.currentBalance === 'number' ? account.currentBalance : 0;
    setNewBalanceStr(balanceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setPendingDrasticBalance(null);
    setChangeType('adjustment');
    setCreateTxInStatement(false);
    setBalanceNote('');
    setBalanceError('');
    setIsUpdateBalanceOpen(true);
  };

  // Execução final da atualização de saldo
  const executeBalanceUpdate = async (targetBalance: number) => {
    if (!selectedAccountForBalance) return;
    const prevBalance = selectedAccountForBalance.currentBalance || 0;
    const difference = targetBalance - prevBalance;

    setIsSaving(true);
    try {
      // 1. Atualizar o documento BankAccount
      const updatedAccount: BankAccount = {
        ...selectedAccountForBalance,
        currentBalance: targetBalance,
        lastUpdatedAt: Date.now(),
      };
      await onSaveAccount(updatedAccount);

      // 2. Registrar histórico de saldo
      const entry: BankBalanceHistoryEntry = {
        id: `hist-${Date.now()}`,
        accountId: selectedAccountForBalance.id,
        accountName: selectedAccountForBalance.name,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        balance: targetBalance,
        previousBalance: prevBalance,
        difference,
        changeType,
        note: balanceNote.trim() || undefined,
      };
      await onSaveHistoryEntry(entry);

      // 3. Opcional: Criar lançamento no Extrato se o usuário marcou expressamente
      if (createTxInStatement && onAddTransaction && difference !== 0 && changeType !== 'adjustment') {
        const isIncome = difference > 0;
        await onAddTransaction({
          description: `${isIncome ? 'Depósito' : 'Saque'} em ${selectedAccountForBalance.name}`,
          amount: Math.abs(difference),
          type: isIncome ? 'income' : 'expense',
          categoryId: isIncome ? 'outros_rendimentos' : 'outros_gastos',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: selectedAccountForBalance.type === 'cash' ? 'cash' : 'transfer',
          status: 'paid',
          notes: balanceNote.trim() || `Movimentação bancária registrada via Saldo em Bancos`,
        });
      }

      setIsUpdateBalanceOpen(false);
      setPendingDrasticBalance(null);
    } catch (err: any) {
      setBalanceError(err.message || 'Erro ao atualizar saldo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Balance Update com checagem de valor drástico
  const handleSaveBalanceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForBalance) return;
    setBalanceError('');

    const parsedNewBalance = parseCurrencyMask(newBalanceStr);
    if (isNaN(parsedNewBalance) || parsedNewBalance < 0) {
      setBalanceError('Informe um saldo numérico válido.');
      return;
    }

    if (parsedNewBalance > 1000000000) {
      setBalanceError('O saldo informado ultrapassa o limite permitido.');
      return;
    }

    const prevBalance = selectedAccountForBalance.currentBalance || 0;
    const diff = Math.abs(parsedNewBalance - prevBalance);

    // Heurística de variação drástica (para evitar zeros a mais ou a menos acidentais)
    const isDrastic = 
      (prevBalance === 0 && parsedNewBalance >= 5000) ||
      (prevBalance > 0 && diff >= 5000 && (parsedNewBalance >= prevBalance * 3 || parsedNewBalance <= prevBalance * 0.15)) ||
      (diff >= 50000);

    // Se houver variação drástica e ainda não foi confirmada, exibir o aviso inline
    if (isDrastic && pendingDrasticBalance !== parsedNewBalance) {
      setPendingDrasticBalance(parsedNewBalance);
      return;
    }

    await executeBalanceUpdate(parsedNewBalance);
  };

  // Archive / Unarchive account
  const handleToggleArchive = async (account: BankAccount) => {
    const updated: BankAccount = {
      ...account,
      isArchived: !account.isArchived,
      lastUpdatedAt: Date.now(),
    };
    await onSaveAccount(updated);
  };

  // Delete account with confirmation
  const handleDeleteAccount = async (account: BankAccount) => {
    const confirmMsg = `Tem certeza que deseja excluir a conta "${account.name}"?\n\nO saldo de ${formatCurrency(account.currentBalance || 0)} será removido.\n\n(Dica: se quiser apenas ocultar a conta sem perder o histórico, você pode clicar no botão "Arquivar").`;
    if (window.confirm(confirmMsg)) {
      await onDeleteAccount(account.id);
    }
  };

  // Preset selector helper
  const handleSelectPreset = (preset: typeof POPULAR_BANKS_PRESETS[0]) => {
    setFormName(preset.name);
    setFormColor(preset.color);
    setFormType(preset.type);
    if (preset.type === 'cash') setFormIcon('banknote');
    else if (preset.type === 'savings') setFormIcon('piggy-bank');
    else setFormIcon('building');
  };

  useLockBodyScroll(isOpen);

  // Early return ONLY here, after all React hooks are executed
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      
      {/* MODAL CONTAINER */}
      <div 
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-[#161619] dark-brushed-metal-modal border border-slate-200/80 dark:border-white/10 rounded-[32px] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        
        {/* =================================================================== */}
        {/* HEADER */}
        {/* =================================================================== */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Saldo em Bancos & Contas
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Manual
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Acompanhe o caixa real guardado em cada instituição e carteira física.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddForm}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar banco</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/15 transition-all cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* BODY (SCROLLABLE) */}
        {/* =================================================================== */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* 1. TOP CARDS: TOTAL GUARDADO + MINI GRÁFICO HISTÓRICO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* 1.1 TOTAL DISPONÍVEL */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 text-white rounded-[26px] p-6 shadow-lg border border-white/10 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    Total Guardado em Contas
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white">
                    {activeAccounts.length} {activeAccounts.length === 1 ? 'conta ativa' : 'contas ativas'}
                  </span>
                </div>

                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-white mt-1">
                  {formatCurrency(totalBalance)}
                </div>

                <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Última atualização geral: <strong>{getDaysAgoText(latestUpdate)}</strong></span>
                </div>
              </div>

              {/* Type breakdown pills */}
              <div className="pt-4 border-t border-white/10 mt-4 flex flex-wrap gap-2 text-[11px]">
                {typeBreakdown.map(item => (
                  <div key={item.type} className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/5 flex items-center gap-1.5">
                    <span className="text-slate-400">{item.label}:</span>
                    <span className="font-bold tabular-nums text-white">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 1.2 MINI GRÁFICO DE EVOLUÇÃO DOS ÚLTIMOS MESES */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-[26px] p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Evolução do Saldo Guardado
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    Histórico dos últimos 6 meses de caixa
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Visão consolidada
                </span>
              </div>

              {/* Bar visualization */}
              <div className="flex items-end justify-between gap-2.5 h-32 pt-3 px-2">
                {monthlyChartData.map((m, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatCurrency(m.total)}
                    </span>
                    <div 
                      className={`w-full max-w-[46px] rounded-t-xl transition-all duration-300 ${
                        m.isCurrent 
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-md shadow-emerald-500/20' 
                          : 'bg-slate-200 dark:bg-zinc-800 hover:bg-emerald-500/50'
                      }`}
                      style={{ height: `${m.percentage}%` }}
                      title={`${m.monthLabel}: ${formatCurrency(m.total)}`}
                    />
                    <span className={`text-[11px] font-semibold ${
                      m.isCurrent 
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                        : 'text-slate-400 dark:text-zinc-500'
                    }`}>
                      {m.monthLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 2. BARRA DE AÇÕES & ABAS ATIVAS / ARQUIVADAS */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Contas Ativas ({activeAccounts.length})
              </button>

              <button
                onClick={() => setActiveTab('archived')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'archived'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Arquivadas ({archivedAccounts.length})
              </button>
            </div>

            <button
              onClick={handleOpenAddForm}
              className="inline-flex sm:hidden items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar banco</span>
            </button>
          </div>

          {/* 3. GRID DE BANCOS */}
          {displayedAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedAccounts.map(acc => {
                const isOutdated = isAccountOutdated(acc.lastUpdatedAt);

                return (
                  <div 
                    key={acc.id}
                    className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top row: Avatar/Icon + Name + Action buttons */}
                      <div className="flex items-start justify-between mb-3">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group/title"
                          onClick={() => handleOpenEditForm(acc)}
                          title="Clique para editar informações deste banco"
                        >
                          <div 
                            className="w-11 h-11 rounded-2xl text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0 transition-transform group-hover/title:scale-105"
                            style={{ backgroundColor: acc.color || '#059669' }}
                          >
                            {renderAccountIcon(acc)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover/title:text-emerald-600 dark:group-hover/title:text-emerald-400 transition-colors">
                              {acc.name}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-300">
                                {ACCOUNT_TYPE_LABELS[acc.type] || 'Conta'}
                              </span>
                              {acc.linkToReserve && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20" title="Vinculado à Reserva de Emergência">
                                  Reserva
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top quick actions */}
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-80 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditForm(acc)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                            title="Editar conta (nome, tipo, cor, ícone)"
                          >
                            <Edit2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleArchive(acc)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                            title={acc.isArchived ? "Desarquivar conta" : "Arquivar conta"}
                          >
                            {acc.isArchived ? <ArchiveRestore className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <Archive className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(acc)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"
                            title="Excluir conta"
                          >
                            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Middle row: Saldo (CLICÁVEL PARA ATUALIZAR MANUALMENTE) */}
                      <div 
                        onClick={() => handleOpenUpdateBalance(acc)}
                        className="my-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer group/saldo"
                        title="Clique diretamente aqui para atualizar o saldo"
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1 font-medium">
                            Saldo Atual <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">(toque para editar)</span>
                          </span>
                          {isOutdated && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 text-[10px]">
                              <AlertTriangle className="w-3 h-3" />
                              Desatualizado
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight flex items-center justify-between">
                          <span>{formatCurrency(acc.currentBalance || 0)}</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 opacity-70 group-hover/saldo:opacity-100 transition-opacity">
                            <Edit2 className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: Last update + CTA */}
                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                      <span className={`text-[11px] ${isOutdated ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400 dark:text-zinc-500'}`}>
                        {getDaysAgoText(acc.lastUpdatedAt)}
                      </span>
                      <button
                        onClick={() => handleOpenUpdateBalance(acc)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Atualizar saldo</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* CARD TRACEJADO AO FINAL DA LISTA: + ADICIONAR BANCO */}
              {activeTab === 'active' && (
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className="border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 min-h-[190px] bg-slate-50/40 hover:bg-emerald-50/30 dark:bg-white/[0.02] dark:hover:bg-emerald-950/20 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 shadow-xs border border-slate-200 dark:border-white/10 group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white text-slate-500 dark:text-zinc-400 flex items-center justify-center transition-all">
                    <Plus className="w-6 h-6 transition-transform group-hover:scale-110" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 block">
                      + Adicionar banco
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mt-0.5">
                      Inter, Itaú, C6, Mercado Pago ou Dinheiro
                    </span>
                  </div>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-slate-50/50 dark:bg-white/5">
              <Building2 className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {activeTab === 'active' ? 'Nenhuma conta bancária cadastrada' : 'Nenhuma conta arquivada'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mb-4">
                {activeTab === 'active' 
                  ? 'Cadastre suas contas correntes, contas digitais ou dinheiro físico para gerenciar seu saldo total.' 
                  : 'Contas arquivadas aparecerão aqui quando você optar por ocultá-las sem perder o histórico.'}
              </p>
              {activeTab === 'active' && (
                <button
                  onClick={handleOpenAddForm}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  + Cadastrar Primeiro Banco
                </button>
              )}
            </div>
          )}

        </div>

      </div>

      {/* =================================================================== */}
      {/* SUBMODAL 1: ATUALIZAR SALDO */}
      {/* =================================================================== */}
      {isUpdateBalanceOpen && selectedAccountForBalance && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => {
            if (e.target === e.currentTarget) setIsUpdateBalanceOpen(false);
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-extrabold text-xs shrink-0"
                  style={{ backgroundColor: selectedAccountForBalance.color || '#059669' }}
                >
                  {renderAccountIcon(selectedAccountForBalance)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Atualizar Saldo: {selectedAccountForBalance.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Saldo anterior: <strong>{formatCurrency(selectedAccountForBalance.currentBalance || 0)}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUpdateBalanceOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBalanceUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Novo Saldo Atual (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-zinc-500">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newBalanceStr}
                    onChange={e => setNewBalanceStr(formatCurrencyMask(e.target.value))}
                    placeholder="0,00"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white font-extrabold text-base sm:text-lg tabular-nums focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* AVISO DE VARIAÇÃO DRÁSTICA ANTES DE SALVAR */}
              {pendingDrasticBalance !== null && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Atenção: Variação de saldo muito alta!</p>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                        O novo saldo (<strong>{formatCurrency(pendingDrasticBalance)}</strong>) é muito diferente do saldo anterior (<strong>{formatCurrency(selectedAccountForBalance.currentBalance || 0)}</strong>).
                        Verifique se não digitou dígitos a mais ou a menos por engano.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                    <button
                      type="button"
                      onClick={() => setPendingDrasticBalance(null)}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs font-semibold cursor-pointer text-slate-700 dark:text-zinc-200"
                    >
                      Revisar valor
                    </button>
                    <button
                      type="button"
                      onClick={() => executeBalanceUpdate(pendingDrasticBalance)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Sim, o saldo é este
                    </button>
                  </div>
                </div>
              )}

              {/* Motivo da alteração */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 space-y-2.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Qual o motivo dessa alteração?
                </span>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-zinc-300">
                    <input
                      type="radio"
                      name="balanceChangeType"
                      value="adjustment"
                      checked={changeType === 'adjustment'}
                      onChange={() => {
                        setChangeType('adjustment');
                        setCreateTxInStatement(false);
                      }}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span><strong>Apenas calibração / ajuste de saldo</strong> (não gera lançamento)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-zinc-300">
                    <input
                      type="radio"
                      name="balanceChangeType"
                      value="deposit"
                      checked={changeType === 'deposit'}
                      onChange={() => setChangeType('deposit')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Foi um <strong>Depósito / Entrada de dinheiro</strong></span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-zinc-300">
                    <input
                      type="radio"
                      name="balanceChangeType"
                      value="withdraw"
                      checked={changeType === 'withdraw'}
                      onChange={() => setChangeType('withdraw')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Foi um <strong>Saque / Retirada de dinheiro</strong></span>
                  </label>
                </div>

                {/* Trava de segurança: só permite marcar se for depósito ou saque */}
                {changeType !== 'adjustment' && onAddTransaction && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 animate-in fade-in duration-150">
                    <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-zinc-400">
                      <input
                        type="checkbox"
                        checked={createTxInStatement}
                        onChange={e => setCreateTxInStatement(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        Registrar também como lançamento no Extrato Mensal de transações (desmarcado por padrão).
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
                  Observação / Motivo (Opcional)
                </label>
                <input
                  type="text"
                  value={balanceNote}
                  onChange={e => setBalanceNote(e.target.value)}
                  placeholder="Ex: Salário, resgate de aplicação, compras do mês..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-base sm:text-xs text-slate-900 dark:text-white focus:outline-emerald-500"
                />
              </div>

              {balanceError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {balanceError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateBalanceOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isSaving ? 'Salvando...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUBMODAL 2: ADICIONAR / EDITAR BANCO */}
      {/* =================================================================== */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => {
            if (e.target === e.currentTarget) setIsFormOpen(false);
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-[28px] max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingAccount ? 'Editar Conta Bancária' : 'Cadastrar Nova Conta Bancária'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Presets de bancos populares para preenchimento rápido */}
            {!editingAccount && (
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-zinc-500 block mb-1.5">
                  Preenchimento Rápido (Bancos Populares)
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {POPULAR_BANKS_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 shrink-0 flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: preset.color }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveBankForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Nome do Banco ou Instituição *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: Inter, Itaú, C6, Mercado Pago, Dinheiro em Casa..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-base sm:text-sm text-slate-900 dark:text-white focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Tipo de Conta
                  </label>
                  <select
                    value={formType}
                    onChange={e => {
                      const newType = e.target.value as BankAccountType;
                      setFormType(newType);
                      if (newType === 'cash') setFormIcon('banknote');
                      else if (newType === 'savings') setFormIcon('piggy-bank');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-base sm:text-xs text-slate-900 dark:text-white focus:outline-emerald-500"
                  >
                    <option value="digital">Conta Digital</option>
                    <option value="checking">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="cash">Dinheiro Físico / Carteira</option>
                    <option value="investment">Conta Investimento</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Saldo {editingAccount ? 'Atual' : 'Inicial'} (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-zinc-500">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formBalance}
                      onChange={e => setFormBalance(formatCurrencyMask(e.target.value))}
                      placeholder="0,00"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-base sm:text-sm font-extrabold text-slate-900 dark:text-white tabular-nums focus:outline-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SELETOR DE ÍCONE */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Ícone de Identificação
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_ICONS.map(({ id, label, Icon }) => {
                    const isSelected = formIcon === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFormIcon(id)}
                        className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 text-slate-600 dark:text-zinc-400 bg-slate-50/50 dark:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate text-[11px]">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SELETOR DE COR */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Cor do Banco
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['#820AD1', '#CC0000', '#EC7000', '#FF7A00', '#CC092F', '#0066B3', '#001E62', '#242424', '#009EE3', '#059669'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${formColor === c ? 'ring-2 ring-emerald-500 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    className="w-7 h-7 rounded-full border-0 p-0 cursor-pointer"
                    title="Escolher cor personalizada"
                  />
                </div>
              </div>

              {/* CONSISTÊNCIA COM O PATRIMÔNIO (Prevenção de contagem dupla) */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formLinkToReserve}
                    onChange={e => setFormLinkToReserve(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-amber-900 dark:text-amber-200 block">
                      Vincular à Reserva de Emergência
                    </span>
                    <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed block">
                      Marque esta opção se o dinheiro desta conta já estiver contabilizado na sua <strong>Reserva de Emergência</strong>. Isso impede que o valor seja somado duas vezes na aba Patrimônio Total.
                    </span>
                  </div>
                </label>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isSaving ? 'Salvando...' : editingAccount ? 'Salvar Alterações' : 'Cadastrar Banco'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
