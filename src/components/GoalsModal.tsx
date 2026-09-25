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
  Check
} from 'lucide-react';
import { FinancialGoal, GoalContribution, MonthPeriod } from '../types';
import { formatCurrency, formatDateShort, getMonthLabel } from '../utils/formatters';

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: FinancialGoal[];
  onSaveGoals: (goals: FinancialGoal[]) => void;
  initialTab?: 'reserve' | 'goals';
  monthlyIncome?: number;
  currentPeriod?: MonthPeriod;
}

export const GoalsModal: React.FC<GoalsModalProps> = ({
  isOpen,
  onClose,
  goals,
  onSaveGoals,
  initialTab = 'reserve',
  monthlyIncome = 0,
  currentPeriod = { year: new Date().getFullYear(), month: new Date().getMonth() },
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

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsCreating(false);
      setActiveGoalId(null);
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
                    <div className="text-3xl sm:text-4xl font-black font-mono-num text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {formatCurrency(emergencyGoal.currentAmount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveGoalId(emergencyGoal.id);
                        setContributionType('deposit');
                      }}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs dark:shadow-[0_0_20px_-3px_rgba(16,185,129,0.45)] transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      + Aporte
                    </button>
                    <button
                      onClick={() => {
                        setActiveGoalId(emergencyGoal.id);
                        setContributionType('withdraw');
                      }}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/15 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowUpRight className="w-4 h-4 text-rose-500" />
                      Resgatar
                    </button>
                  </div>
                </div>

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
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold ml-1 cursor-pointer"
                      >
                        Ajustar
                      </button>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
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
                      className="px-2.5 py-1 text-xs font-mono-num font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 flex-1"
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
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculation breakdown card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
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
                <form onSubmit={handleSaveContribution} className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3.5 animate-in fade-in">
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
                        className="w-full px-3 py-2 text-xs font-mono-num font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
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
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
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
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    Nenhuma movimentação registrada na reserva ainda. Faça o primeiro aporte acima!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {emergencyGoal.history.map(item => {
                      const isDeposit = item.type === 'deposit';
                      return (
                        <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isDeposit ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                              {isDeposit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                                {item.note || (isDeposit ? 'Aporte na Reserva' : 'Resgate da Reserva')}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatDateShort(item.date)}
                              </span>
                            </div>
                          </div>

                          <div className={`font-mono-num font-extrabold text-sm shrink-0 ${
                            isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isDeposit ? '+ ' : '- '} {formatCurrency(item.amount)}
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
                <form onSubmit={handleCreateGoal} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3.5 animate-in fade-in">
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
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                        className="w-full px-3 py-2 text-xs font-mono-num rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
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
                        className="w-full px-3 py-2 text-xs font-mono-num rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
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
                <form onSubmit={handleSaveContribution} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3.5 animate-in fade-in">
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

                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setContributionType('deposit')}
                      className={`py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 cursor-pointer ${
                        contributionType === 'deposit'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
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
                          : 'text-slate-600 dark:text-slate-300'
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
                        className="w-full px-3 py-2 text-xs font-mono-num rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
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
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveGoalId(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
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
                    <Target className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
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
                        className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/90 dark:border-slate-700/80 shadow-xs space-y-3"
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
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
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
    </div>
  );
};
