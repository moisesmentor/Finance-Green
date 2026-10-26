import React, { useState, useEffect } from 'react';
import { 
  X, 
  Target, 
  Plus, 
  TrendingUp, 
  Calendar, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Sparkles,
  Wallet,
  PiggyBank,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Percent,
  Sliders,
  AlertCircle,
  History,
  Check,
  Building2,
  Landmark,
  Pencil,
  RotateCcw,
  Info,
  AlertTriangle,
  Scale
} from 'lucide-react';
import { FinancialGoal, GoalContribution, MonthPeriod, BankAccount, ReserveLocation } from '../types';
import { formatCurrency, formatDateShort, getMonthLabel } from '../utils/formatters';

interface TempLocationRow {
  id: string;
  name: string;
  amountStr: string;
  bankAccountId?: string;
}

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: FinancialGoal[];
  onSaveGoals: (goals: FinancialGoal[]) => void;
  initialTab?: 'reserve' | 'goals';
  monthlyIncome?: number;
  currentPeriod?: MonthPeriod;
  bankAccounts?: BankAccount[];
}

export const GoalsModal: React.FC<GoalsModalProps> = ({
  isOpen,
  onClose,
  goals,
  onSaveGoals,
  initialTab = 'reserve',
  monthlyIncome = 0,
  currentPeriod = { year: new Date().getFullYear(), month: new Date().getMonth() },
  bankAccounts = [],
}) => {
  const [activeTab, setActiveTab] = useState<'reserve' | 'goals'>(initialTab);
  const [isCreating, setIsCreating] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  // New goal form state
  const [title, setTitle] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [initialAmountStr, setInitialAmountStr] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#059669');
  const [error, setError] = useState('');

  // Contribution modal state (deposit/withdraw)
  const [contributionType, setContributionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [contributionAmountStr, setContributionAmountStr] = useState('');
  const [contributionNote, setContributionNote] = useState('');

  // Emergency Fund Custom Settings State
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [newTargetStr, setNewTargetStr] = useState('');
  const [customPercentStr, setCustomPercentStr] = useState('');

  // Emergency Fund Balance Adjustment Modal State (Item 2 - Option B: Multiple Locations)
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);
  const [tempLocations, setTempLocations] = useState<TempLocationRow[]>([]);
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [confirmLargeDiff, setConfirmLargeDiff] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsCreating(false);
      setActiveGoalId(null);
      setIsAdjustingBalance(false);
      setError('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // 1. Identify or initialize Emergency Fund Goal
  const emergencyGoal = goals.find(g => g.isEmergencyFund || g.title.toLowerCase().includes('reserva')) || {
    id: 'goal-emergency-fund',
    title: 'Reserva de Emergência',
    targetAmount: 15000,
    currentAmount: 0,
    categoryIcon: 'ShieldCheck',
    color: '#059669',
    isEmergencyFund: true,
    autoReservePercentage: 10,
    autoReserveMode: 'percentage' as const,
    createdAt: Date.now(),
    history: [],
  };

  const otherGoals = goals.filter(g => g.id !== emergencyGoal.id && !g.isEmergencyFund && !g.title.toLowerCase().includes('reserva'));

  // Calculate current month key
  const currentPeriodKey = `${currentPeriod.year}-${String(currentPeriod.month + 1).padStart(2, '0')}`;
  const isMonthConfirmed = emergencyGoal.lastConfirmedMonth === currentPeriodKey;

  // Calculate suggested monthly savings
  const reservePercentage = emergencyGoal.autoReservePercentage || 10;
  const suggestedAmount = monthlyIncome > 0 
    ? Math.round((monthlyIncome * (reservePercentage / 100)) * 100) / 100 
    : 0;

  // Helper to persist goals with emergency fund ensured
  const updateGoalsWithEmergency = (updatedEmergency: FinancialGoal) => {
    const exists = goals.some(g => g.id === updatedEmergency.id);
    const newGoalsList = exists
      ? goals.map(g => g.id === updatedEmergency.id ? updatedEmergency : g)
      : [updatedEmergency, ...goals];
    onSaveGoals(newGoalsList);
  };

  // Change auto reserve percentage
  const handleSetPercentage = (percent: number) => {
    const updated: FinancialGoal = {
      ...emergencyGoal,
      autoReservePercentage: percent,
      autoReserveMode: 'percentage',
    };
    updateGoalsWithEmergency(updated);
  };

  // Confirm monthly reserve deposit
  const handleConfirmMonthlyReserve = () => {
    if (suggestedAmount <= 0) {
      setError('Cadastre receitas neste mês para calcular o valor do aporte.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newContrib: GoalContribution = {
      id: `contrib-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      amount: suggestedAmount,
      date: todayStr,
      type: 'deposit',
      note: `Aporte automático de ${getMonthLabel(currentPeriod.year, currentPeriod.month)} (${reservePercentage}% da receita)`,
      createdAt: Date.now(),
    };

    const updated: FinancialGoal = {
      ...emergencyGoal,
      currentAmount: Math.round((emergencyGoal.currentAmount + suggestedAmount) * 100) / 100,
      lastConfirmedMonth: currentPeriodKey,
      history: [newContrib, ...(emergencyGoal.history || [])],
    };

    updateGoalsWithEmergency(updated);
    setError('');
  };

  // Save new target amount for emergency fund
  const handleSaveEmergencyTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(newTargetStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      setError('Informe um valor alvo válido maior que zero.');
      return;
    }
    const updated: FinancialGoal = {
      ...emergencyGoal,
      targetAmount: Math.round(num * 100) / 100,
    };
    updateGoalsWithEmergency(updated);
    setIsEditingTarget(false);
    setNewTargetStr('');
    setError('');
  };

  // Create new goal
  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Informe um título para a meta.');
      return;
    }

    const targetNum = parseFloat(targetAmountStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(targetNum) || targetNum <= 0) {
      setError('Informe um valor objetivo válido.');
      return;
    }

    const initialNum = parseFloat(initialAmountStr.replace(/\./g, '').replace(',', '.')) || 0;

    const newGoal: FinancialGoal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: title.trim(),
      targetAmount: Math.round(targetNum * 100) / 100,
      currentAmount: Math.round(initialNum * 100) / 100,
      deadline: deadline || undefined,
      categoryIcon: 'Target',
      color,
      createdAt: Date.now(),
      history: initialNum > 0 ? [
        {
          id: `contrib-${Date.now()}`,
          amount: initialNum,
          date: new Date().toISOString().split('T')[0],
          type: 'deposit',
          note: 'Aporte inicial',
          createdAt: Date.now(),
        }
      ] : [],
    };

    onSaveGoals([newGoal, ...goals]);
    setIsCreating(false);
    setTitle('');
    setTargetAmountStr('');
    setInitialAmountStr('');
    setDeadline('');
    setError('');
  };

  // Delete goal
  const handleDeleteGoal = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta meta?')) {
      onSaveGoals(goals.filter(g => g.id !== id));
      if (activeGoalId === id) setActiveGoalId(null);
    }
  };

  // Contribution to goal or emergency fund
  const handleSaveContribution = (e: React.FormEvent) => {
    e.preventDefault();
    const targetGoalId = activeGoalId || emergencyGoal.id;
    const targetGoal = goals.find(g => g.id === targetGoalId) || emergencyGoal;

    const amountNum = parseFloat(contributionAmountStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Informe um valor válido.');
      return;
    }

    const newCurrent = contributionType === 'deposit' 
      ? targetGoal.currentAmount + amountNum 
      : Math.max(0, targetGoal.currentAmount - amountNum);

    const newContrib: GoalContribution = {
      id: `contrib-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      amount: Math.round(amountNum * 100) / 100,
      date: new Date().toISOString().split('T')[0],
      type: contributionType,
      note: contributionNote.trim() || undefined,
      createdAt: Date.now(),
    };

    const updatedTarget: FinancialGoal = {
      ...targetGoal,
      currentAmount: Math.round(newCurrent * 100) / 100,
      history: [newContrib, ...(targetGoal.history || [])],
    };

    updateGoalsWithEmergency(updatedTarget);
    setActiveGoalId(null);
    setContributionAmountStr('');
    setContributionNote('');
    setError('');
  };

  // Helper to parse currency inputs
  const parseAmount = (val: string) => {
    if (!val) return 0;
    const clean = val.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.max(0, num);
  };

  // Open adjustment modal (Option B: Multiple locations)
  const handleOpenAdjustBalance = () => {
    if (emergencyGoal.locations && emergencyGoal.locations.length > 0) {
      setTempLocations(
        emergencyGoal.locations.map(loc => ({
          id: loc.id,
          name: loc.name,
          amountStr: loc.amount > 0 ? loc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
          bankAccountId: loc.bankAccountId,
        }))
      );
    } else if (emergencyGoal.location || emergencyGoal.currentAmount > 0) {
      setTempLocations([
        {
          id: `loc-${Date.now()}`,
          name: emergencyGoal.location || 'Conta Principal',
          amountStr: emergencyGoal.currentAmount > 0 ? emergencyGoal.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
        }
      ]);
    } else {
      setTempLocations([
        {
          id: `loc-${Date.now()}`,
          name: '',
          amountStr: '',
        }
      ]);
    }
    setAdjustmentNote('');
    setConfirmLargeDiff(false);
    setError('');
    setIsAdjustingBalance(true);
  };

  // Row management for adjustment modal
  const handleAddLocationRow = () => {
    setTempLocations(prev => [
      ...prev,
      { id: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, name: '', amountStr: '' }
    ]);
  };

  const handleRemoveLocationRow = (id: string) => {
    if (tempLocations.length <= 1) {
      setTempLocations([{ id: `loc-${Date.now()}`, name: '', amountStr: '' }]);
      return;
    }
    setTempLocations(prev => prev.filter(row => row.id !== id));
  };

  const handleUpdateRowName = (id: string, name: string, bankAccountId?: string) => {
    setTempLocations(prev => prev.map(row => row.id === id ? { ...row, name, bankAccountId } : row));
  };

  const handleUpdateRowAmount = (id: string, amountStr: string) => {
    setTempLocations(prev => prev.map(row => row.id === id ? { ...row, amountStr } : row));
  };

  // Calculations for adjustment
  const newCalculatedTotal = tempLocations.reduce((sum, row) => sum + parseAmount(row.amountStr), 0);
  const oldTotal = emergencyGoal.currentAmount || 0;
  const diffAmount = Math.round((newCalculatedTotal - oldTotal) * 100) / 100;
  const isLargeDiff = oldTotal > 0 && Math.abs(diffAmount) > (oldTotal * 0.5);

  const suggestedBankNames = Array.from(
    new Set([
      ...(bankAccounts?.map(b => b.name).filter(Boolean) || []),
      'Nubank',
      'Inter',
      'Itaú',
      'Santander',
      'Poupança Caixa',
      'C6 Bank',
      'Dinheiro em espécie',
    ])
  ).slice(0, 8);

  // Save manual balance adjustment
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLargeDiff && !confirmLargeDiff) {
      setError('Por favor, confirme a alteração expressiva no saldo antes de salvar.');
      return;
    }

    const validRows = tempLocations.filter(row => row.name.trim() || parseAmount(row.amountStr) > 0);
    const finalLocations: ReserveLocation[] = validRows.map(row => ({
      id: row.id || `loc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: row.name.trim() || 'Reserva',
      amount: Math.round(parseAmount(row.amountStr) * 100) / 100,
      bankAccountId: row.bankAccountId,
      updatedAt: Date.now(),
    }));

    const locationSummary = finalLocations.map(l => `${l.name} (${formatCurrency(l.amount)})`).join(' • ');
    const todayStr = new Date().toISOString().split('T')[0];

    const newContrib: GoalContribution = {
      id: `contrib-adj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      amount: Math.abs(diffAmount),
      diffAmount,
      previousAmount: oldTotal,
      newAmount: Math.round(newCalculatedTotal * 100) / 100,
      location: locationSummary || undefined,
      locations: finalLocations,
      date: todayStr,
      type: 'adjustment',
      note: adjustmentNote.trim() || (diffAmount >= 0 ? 'Ajuste de saldo (+)' : 'Ajuste de saldo (-)'),
      createdAt: Date.now(),
    };

    const updated: FinancialGoal = {
      ...emergencyGoal,
      currentAmount: Math.round(newCalculatedTotal * 100) / 100,
      locations: finalLocations,
      location: locationSummary || undefined,
      lastBalanceUpdateAt: Date.now(),
      history: [newContrib, ...(emergencyGoal.history || [])],
    };

    updateGoalsWithEmergency(updated);
    setIsAdjustingBalance(false);
    setError('');
  };

  // Undo latest adjustment
  const handleUndoLatestAdjustment = (adjItem: GoalContribution) => {
    if (window.confirm(`Deseja realmente desfazer este ajuste e restaurar o saldo anterior de ${formatCurrency(adjItem.previousAmount ?? 0)}?`)) {
      const restoredAmount = adjItem.previousAmount ?? 0;
      const updatedHistory = (emergencyGoal.history || []).filter(h => h.id !== adjItem.id);
      const priorAdj = updatedHistory.find(h => h.type === 'adjustment' && h.locations && h.locations.length > 0);

      const updated: FinancialGoal = {
        ...emergencyGoal,
        currentAmount: Math.round(restoredAmount * 100) / 100,
        locations: priorAdj?.locations || undefined,
        location: priorAdj?.location || undefined,
        lastBalanceUpdateAt: Date.now(),
        history: updatedHistory,
      };

      updateGoalsWithEmergency(updated);
    }
  };

  // 30 days outdated check
  const isOutdated = emergencyGoal.lastBalanceUpdateAt
    ? (Date.now() - emergencyGoal.lastBalanceUpdateAt) > (30 * 24 * 60 * 60 * 1000)
    : false;

  const emergencyPercentage = Math.min(100, Math.round((emergencyGoal.currentAmount / emergencyGoal.targetAmount) * 100));
  const emergencyRemaining = Math.max(0, emergencyGoal.targetAmount - emergencyGoal.currentAmount);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-goals"
        className="bg-white dark-brushed-metal-modal rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header with Segmented Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Planejamento & Reservas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Construa sua segurança financeira e guarde para metas futuras
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Segmented Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-black/50 rounded-xl border border-slate-200/80 dark:border-white/10">
              <button
                onClick={() => { setActiveTab('reserve'); setActiveGoalId(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'reserve'
                    ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Reserva de Emergência
              </button>
              <button
                onClick={() => { setActiveTab('goals'); setActiveGoalId(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'goals'
                    ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                Outras Metas ({otherGoals.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 1: RESERVA DE EMERGÊNCIA (COFRINHO BLINDADO) */}
          {/* ================================================================= */}
          {activeTab === 'reserve' && (
            <div className="space-y-6">
              
              {/* 1.1 Hero Card da Reserva */}
              <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-[#151518] border border-emerald-500/30 dark:border-emerald-500/40 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        Cofrinho Blindado
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">• Segurança Financeira</span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="text-3xl sm:text-4xl font-black font-mono-num text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {formatCurrency(emergencyGoal.currentAmount)}
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAdjustBalance}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 transition-all cursor-pointer shadow-xs active:scale-95 min-h-[34px]"
                        title="Atualizar saldo guardado e locais da reserva"
                      >
                        <Pencil className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Atualizar saldo</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveGoalId(emergencyGoal.id);
                        setContributionType('deposit');
                      }}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs dark:shadow-[0_0_20px_-3px_rgba(16,185,129,0.45)] transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 min-h-[40px]"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      + Aporte
                    </button>
                    <button
                      onClick={() => {
                        setActiveGoalId(emergencyGoal.id);
                        setContributionType('withdraw');
                      }}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/15 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 min-h-[40px]"
                    >
                      <ArrowUpRight className="w-4 h-4 text-rose-500" />
                      Resgatar
                    </button>
                  </div>
                </div>

                {/* Location breakdown chips (Option B) */}
                {emergencyGoal.locations && emergencyGoal.locations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/15 dark:border-white/10 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      Guardado em:
                    </span>
                    {emergencyGoal.locations.map(loc => (
                      <span
                        key={loc.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-xs"
                      >
                        <span>{loc.name}:</span>
                        <span className="font-mono-num text-emerald-600 dark:text-emerald-400 font-extrabold">
                          {formatCurrency(loc.amount)}
                        </span>
                      </span>
                    ))}
                    {emergencyGoal.lastBalanceUpdateAt && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Atualizado em {formatDateShort(new Date(emergencyGoal.lastBalanceUpdateAt).toISOString().split('T')[0])}
                      </span>
                    )}
                  </div>
                )}

                {/* 30-day Inactivity Alert */}
                {isOutdated && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
                    <Info className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>Seu saldo da reserva não é conferido há mais de 30 dias. Verifique se os valores nos bancos continuam os mesmos.</span>
                  </div>
                )}

                {/* Progress Bar & Goal Target */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-600 dark:text-slate-300">
                      Progresso da Reserva: <strong className="font-mono-num text-slate-900 dark:text-white">{emergencyPercentage}%</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 dark:text-slate-400">Meta:</span>
                      <strong className="font-mono-num text-slate-900 dark:text-white">{formatCurrency(emergencyGoal.targetAmount)}</strong>
                      <button
                        onClick={() => { setIsEditingTarget(true); setNewTargetStr(emergencyGoal.targetAmount.toString()); }}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold ml-1 cursor-pointer inline-flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        Ajustar
                      </button>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-700"
                      style={{ width: `${emergencyPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    <span>{emergencyRemaining > 0 ? `Faltam ${formatCurrency(emergencyRemaining)} para atingir o objetivo` : 'Meta de reserva atingida com sucesso! 🎉'}</span>
                    <span>Prazo ideal: 3 a 6 meses de gastos</span>
                  </div>
                </div>

                {/* Modal / Inline edit of target */}
                {isEditingTarget && (
                  <form onSubmit={handleSaveEmergencyTarget} className="p-3 bg-white dark:bg-black/50 rounded-xl border border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs animate-in fade-in">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Nova Meta (R$):</span>
                    <input
                      type="text"
                      value={newTargetStr}
                      onChange={e => setNewTargetStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                      className="px-2.5 py-1 text-xs font-mono-num font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100 flex-1"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingTarget(false)}
                      className="px-2 py-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </form>
                )}
              </div>

              {/* 1.2 Módulo Inteligente de Aporte Mensal Automático */}
              <div className="p-5 rounded-2xl bg-white dark-brushed-metal border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Regra de Poupança Automática Mensal
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Defina um percentual padrão das receitas de cada mês para ser guardado
                    </p>
                  </div>

                  {/* Percentage Preset Pill Buttons */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    {[5, 10, 15, 20].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleSetPercentage(pct)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          reservePercentage === pct
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/15'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculation breakdown card */}
                <div className="p-4 rounded-xl bg-slate-50 dark-subcard border border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Receitas confirmadas deste mês ({getMonthLabel(currentPeriod.year, currentPeriod.month)}):
                    </div>
                    <div className="text-base font-extrabold font-mono-num text-slate-900 dark:text-white">
                      {formatCurrency(monthlyIncome)}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                      Regra ativa: {reservePercentage}% de economia = {formatCurrency(suggestedAmount)}
                    </div>
                  </div>

                  <div>
                    {isMonthConfirmed ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Aporte deste mês já confirmado!</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConfirmMonthlyReserve}
                        disabled={suggestedAmount <= 0}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 ${
                          suggestedAmount > 0
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/20'
                            : 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Confirmar Reserva do Mês ({formatCurrency(suggestedAmount)})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 1.3 Form de Depósito / Saque Avulso (se ativado) */}
              {activeGoalId === emergencyGoal.id && (
                <form onSubmit={handleSaveContribution} className="p-4 bg-slate-50 dark-subcard rounded-xl border border-slate-200 dark:border-white/10 space-y-3.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      {contributionType === 'deposit' ? 'Guardar Valor na Reserva' : 'Resgatar Valor da Reserva'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setActiveGoalId(null)}
                      className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Valor (R$) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={contributionAmountStr}
                        onChange={e => setContributionAmountStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                        placeholder="0,00"
                        className="w-full px-3 py-2 text-xs font-mono-num font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Motivo / Observação
                      </label>
                      <input
                        type="text"
                        value={contributionNote}
                        onChange={e => setContributionNote(e.target.value)}
                        placeholder={contributionType === 'deposit' ? 'Ex: Economia bônus, rendimentos...' : 'Ex: Reparo emergencial, conserto carro...'}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveGoalId(null)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white shadow-xs cursor-pointer ${
                        contributionType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                      }`}
                    >
                      Confirmar {contributionType === 'deposit' ? 'Depósito' : 'Resgate'}
                    </button>
                  </div>
                </form>
              )}

              {/* 1.4 Histórico Completo de Aportes e Resgates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Histórico de Aportes & Resgates ({emergencyGoal.history?.length || 0})
                  </h4>
                </div>

                {!emergencyGoal.history || emergencyGoal.history.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-100 dark:border-white/10">
                    Nenhuma movimentação registrada na reserva ainda. Faça o primeiro aporte acima!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/[0.06] bg-slate-50/50 dark:bg-black/40 rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden">
                    {emergencyGoal.history.map((item, index) => {
                      const isAdjustment = item.type === 'adjustment';
                      const isDeposit = item.type === 'deposit';
                      const isPositiveDiff = (item.diffAmount ?? 0) >= 0;

                      return (
                        <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isAdjustment
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                : isDeposit 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                              {isAdjustment ? (
                                <Scale className="w-3.5 h-3.5" />
                              ) : isDeposit ? (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {item.note || (isAdjustment ? 'Ajuste de Saldo' : isDeposit ? 'Aporte na Reserva' : 'Resgate da Reserva')}
                                </span>
                                {isAdjustment && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                                    Ajuste
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                                <span>{formatDateShort(item.date)}</span>
                                {item.location && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[260px] text-slate-500 dark:text-slate-400" title={item.location}>
                                      {item.location}
                                    </span>
                                  </>
                                )}
                                {item.newAmount !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono-num text-slate-500 dark:text-slate-400">
                                      Saldo: {formatCurrency(item.newAmount)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className={`font-mono-num font-extrabold text-sm ${
                              isAdjustment
                                ? isPositiveDiff
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : 'text-amber-600 dark:text-amber-400'
                                : isDeposit 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {isAdjustment ? (
                                isPositiveDiff
                                  ? `+ ${formatCurrency(Math.abs(item.diffAmount ?? item.amount))}` 
                                  : `- ${formatCurrency(Math.abs(item.diffAmount ?? item.amount))}`
                              ) : (
                                `${isDeposit ? '+ ' : '- '}${formatCurrency(item.amount)}`
                              )}
                            </div>

                            {/* Desfazer action button for the latest adjustment */}
                            {isAdjustment && index === 0 && (
                              <button
                                type="button"
                                onClick={() => handleUndoLatestAdjustment(item)}
                                className="px-2 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                title="Desfazer este ajuste e restaurar o saldo anterior"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Desfazer</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: OUTRAS METAS & COFRINHOS */}
          {/* ================================================================= */}
          {activeTab === 'goals' && (
            <div className="space-y-5">
              
              {/* Action Bar */}
              {!isCreating && !activeGoalId && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {otherGoals.length} {otherGoals.length === 1 ? 'Meta Ativa' : 'Metas Ativas'}
                  </span>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Criar Nova Meta
                  </button>
                </div>
              )}

              {/* CREATE GOAL FORM */}
              {isCreating && (
                <form onSubmit={handleCreateGoal} className="p-4 bg-slate-50 dark-subcard rounded-xl border border-slate-200 dark:border-white/10 space-y-3.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-emerald-600" />
                      Novo Objetivo Financeiro
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nome do Objetivo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ex: Viagem de Férias, Troca de Carro, Entrada Imóvel..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Valor Alvo Total (R$) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={targetAmountStr}
                        onChange={e => setTargetAmountStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                        placeholder="10.000,00"
                        className="w-full px-3 py-2 text-xs font-mono-num rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Aporte Inicial Já Guardado (R$)
                      </label>
                      <input
                        type="text"
                        value={initialAmountStr}
                        onChange={e => setInitialAmountStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                        placeholder="0,00"
                        className="w-full px-3 py-2 text-xs font-mono-num rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Prazo Desejado (Opcional)
                      </label>
                      <input
                        type="date"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0c0e] text-slate-800 dark:text-zinc-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Cor de Destaque
                      </label>
                      <div className="flex items-center gap-2 pt-1">
                        {['#059669', '#2563eb', '#9333ea', '#ea580c', '#db2777', '#0284c7'].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                              color === c ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                    >
                      Salvar Meta
                    </button>
                  </div>
                </form>
              )}

              {/* CONTRIBUTION FORM FOR OTHER GOALS */}
              {activeGoalId && activeGoalId !== emergencyGoal.id && (
                <form onSubmit={handleSaveContribution} className="p-4 bg-slate-50 dark-subcard rounded-xl border border-slate-200 dark:border-white/10 space-y-3.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <PiggyBank className="w-4 h-4 text-emerald-600" />
                      Movimentar Meta: {goals.find(g => g.id === activeGoalId)?.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveGoalId(null)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 dark:bg-black/50 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setContributionType('deposit')}
                      className={`py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 cursor-pointer ${
                        contributionType === 'deposit'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-zinc-300'
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      Guardar Dinheiro (Aporte)
                    </button>
                    <button
                      type="button"
                      onClick={() => setContributionType('withdraw')}
                      className={`py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 cursor-pointer ${
                        contributionType === 'withdraw'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-zinc-300'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Resgatar (Saque)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Valor (R$) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={contributionAmountStr}
                        onChange={e => setContributionAmountStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                        placeholder="0,00"
                        className="w-full px-3 py-2 text-xs font-mono-num rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100 font-bold"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nota / Motivo
                      </label>
                      <input
                        type="text"
                        value={contributionNote}
                        onChange={e => setContributionNote(e.target.value)}
                        placeholder="Ex: Aporte do mês..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveGoalId(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                    >
                      Confirmar {contributionType === 'deposit' ? 'Depósito' : 'Saque'}
                    </button>
                  </div>
                </form>
              )}

              {/* OTHER GOALS LIST */}
              <div className="space-y-4">
                {otherGoals.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <Target className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium">Você ainda não tem outros objetivos cadastrados.</p>
                    <p className="text-xs mt-1">Crie metas para viagens, compras planejadas ou novos investimentos!</p>
                  </div>
                ) : (
                  otherGoals.map(goal => {
                    const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

                    return (
                      <div
                        key={goal.id}
                        className="bg-slate-50/80 dark-subcard rounded-xl p-4 border border-slate-200/90 dark:border-white/10 shadow-xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: goal.color }}
                              />
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {goal.title}
                              </h4>
                              {percentage >= 100 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" /> Meta Concluída!
                                </span>
                              )}
                            </div>
                            {goal.deadline && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                <Clock className="w-3.5 h-3.5" />
                                Prazo: {formatDateShort(goal.deadline)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setActiveGoalId(goal.id);
                                setContributionType('deposit');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              Aporte
                            </button>
                            <button
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Excluir meta"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-xs mb-1 font-medium">
                            <span className="text-slate-600 dark:text-slate-400">
                              {formatCurrency(goal.currentAmount)} acumulados
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {percentage}% ({formatCurrency(remaining)} restantes)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: goal.color || '#059669',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* ================================================================= */}
      {/* MODAL SECUNDÁRIO: ATUALIZAR SALDO GUARDADO (OPÇÃO B - MULTI-LOCAIS) */}
      {/* ================================================================= */}
      {isAdjustingBalance && (
        <div 
          className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/80 dark:bg-black/90 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsAdjustingBalance(false)}
        >
          <div 
            className="bg-white dark-brushed-metal-modal rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 flex flex-col max-h-[92vh]"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Atualizar Saldo Guardado na Reserva
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Distribua o valor por banco/local ou defina um total consolidado
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustingBalance(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveAdjustment} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Comparison Card */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark-subcard rounded-xl border border-slate-200/80 dark:border-white/10 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Saldo Atual</div>
                  <div className="text-xs sm:text-sm font-mono-num font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(oldTotal)}
                  </div>
                </div>
                <div className="border-x border-slate-200 dark:border-white/10 px-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Novo Saldo</div>
                  <div className="text-xs sm:text-sm font-mono-num font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(newCalculatedTotal)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Diferença</div>
                  <div className={`text-xs sm:text-sm font-mono-num font-extrabold ${
                    diffAmount > 0 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : diffAmount < 0 
                        ? 'text-amber-600 dark:text-amber-400' 
                        : 'text-slate-500'
                  }`}>
                    {diffAmount === 0 
                      ? 'R$ 0,00' 
                      : diffAmount > 0 
                        ? `+ ${formatCurrency(diffAmount)}` 
                        : `- ${formatCurrency(Math.abs(diffAmount))}`}
                  </div>
                </div>
              </div>

              {/* Location rows */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Onde o dinheiro está guardado (Locais & Saldos):
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {tempLocations.length} {tempLocations.length === 1 ? 'local' : 'locais'}
                  </span>
                </div>

                <div className="space-y-2">
                  {tempLocations.map((row) => (
                    <div 
                      key={row.id}
                      className="p-3 bg-slate-50/70 dark:bg-black/40 rounded-xl border border-slate-200/70 dark:border-white/10 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={row.name}
                            onChange={e => handleUpdateRowName(row.id, e.target.value)}
                            placeholder="Nome do local (ex: Nubank, Poupança Caixa, Dinheiro...)"
                            className="w-full px-3 py-2 text-base sm:text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 min-h-[44px] sm:min-h-0"
                          />
                        </div>
                        <div className="w-36 sm:w-40 shrink-0">
                          <input
                            type="text"
                            value={row.amountStr}
                            onChange={e => handleUpdateRowAmount(row.id, e.target.value.replace(/[^0-9,.]/g, ''))}
                            placeholder="0,00"
                            className="w-full px-3 py-2 text-base sm:text-xs font-mono-num font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100 text-right min-h-[44px] sm:min-h-0"
                          />
                        </div>
                        {tempLocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLocationRow(row.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-0 flex items-center justify-center"
                            title="Remover este local"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Bank Quick Suggestion Chips (shown for row if empty) */}
                      {!row.name.trim() && suggestedBankNames.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[10px] text-slate-400">Sugestões:</span>
                          {suggestedBankNames.slice(0, 5).map(bankName => (
                            <button
                              key={bankName}
                              type="button"
                              onClick={() => handleUpdateRowName(row.id, bankName)}
                              className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                            >
                              {bankName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddLocationRow}
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-white/20 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  + Adicionar outro local ou banco
                </button>
              </div>

              {/* Observation Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo / Observação do ajuste (opcional)
                </label>
                <input
                  type="text"
                  value={adjustmentNote}
                  onChange={e => setAdjustmentNote(e.target.value)}
                  placeholder="Ex: Rendimentos do mês, usei R$ 300 para o conserto do carro..."
                  className="w-full px-3 py-2 text-base sm:text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100 min-h-[44px] sm:min-h-0"
                />
              </div>

              {/* Large Diff Confirmation Checkbox */}
              {isLargeDiff && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      Atenção: A diferença é superior a 50% do saldo atual ({formatCurrency(oldTotal)} &rarr; {formatCurrency(newCalculatedTotal)}).
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={confirmLargeDiff}
                      onChange={e => setConfirmLargeDiff(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <span>Confirmo que o novo valor de {formatCurrency(newCalculatedTotal)} está correto.</span>
                  </label>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAdjustingBalance(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLargeDiff && !confirmLargeDiff}
                  className={`px-5 py-2.5 text-xs font-extrabold rounded-xl text-white shadow-xs transition-all flex items-center gap-2 min-h-[44px] ${
                    isLargeDiff && !confirmLargeDiff
                      ? 'bg-slate-300 dark:bg-white/10 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer shadow-emerald-600/20 active:scale-95'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Salvar Novo Saldo ({formatCurrency(newCalculatedTotal)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
