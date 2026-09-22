import React, { useState } from 'react';
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
  Clock
} from 'lucide-react';
import { FinancialGoal, GoalContribution } from '../types';
import { formatCurrency, formatDateShort } from '../utils/formatters';

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: FinancialGoal[];
  onSaveGoals: (goals: FinancialGoal[]) => void;
}

export const GoalsModal: React.FC<GoalsModalProps> = ({
  isOpen,
  onClose,
  goals,
  onSaveGoals,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  // New goal form state
  const [title, setTitle] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [initialAmountStr, setInitialAmountStr] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#059669');
  const [error, setError] = useState('');

  // Contribution modal state
  const [contributionType, setContributionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [contributionAmountStr, setContributionAmountStr] = useState('');
  const [contributionNote, setContributionNote] = useState('');

  if (!isOpen) return null;

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
      categoryIcon: 'Wallet',
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

  const handleDeleteGoal = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta meta?')) {
      onSaveGoals(goals.filter(g => g.id !== id));
      if (activeGoalId === id) setActiveGoalId(null);
    }
  };

  const handleSaveContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoalId) return;

    const amountNum = parseFloat(contributionAmountStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Informe um valor válido.');
      return;
    }

    const updatedGoals = goals.map(g => {
      if (g.id !== activeGoalId) return g;

      const newCurrent = contributionType === 'deposit' 
        ? g.currentAmount + amountNum 
        : Math.max(0, g.currentAmount - amountNum);

      const newContrib: GoalContribution = {
        id: `contrib-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        amount: Math.round(amountNum * 100) / 100,
        date: new Date().toISOString().split('T')[0],
        type: contributionType,
        note: contributionNote.trim() || undefined,
        createdAt: Date.now(),
      };

      return {
        ...g,
        currentAmount: Math.round(newCurrent * 100) / 100,
        history: [newContrib, ...(g.history || [])],
      };
    });

    onSaveGoals(updatedGoals);
    setActiveGoalId(null);
    setContributionAmountStr('');
    setContributionNote('');
    setError('');
  };

  const selectedGoal = goals.find(g => g.id === activeGoalId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-goals"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Cofrinhos & Metas Financeiras
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Poupe para objetivos, reservas de emergência e conquistas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-medium">
              {error}
            </div>
          )}

          {/* Action Bar */}
          {!isCreating && !activeGoalId && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {goals.length} {goals.length === 1 ? 'Meta Ativa' : 'Metas Ativas'}
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
                  Nova Meta Financeira
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
                  placeholder="Ex: Reserva de Emergência, Viagem Disney, Comprar Carro..."
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

          {/* CONTRIBUTION (DEPOSIT / WITHDRAW) FORM */}
          {selectedGoal && (
            <form onSubmit={handleSaveContribution} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <PiggyBank className="w-4 h-4 text-emerald-600" />
                  Movimentar Meta: {selectedGoal.title}
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
                  Guardar Dinheiro (Depósito)
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
                    placeholder="Ex: Aporte do 13º salário..."
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

          {/* GOALS LIST */}
          <div className="space-y-4">
            {goals.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <PiggyBank className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">Você ainda não tem metas cadastradas.</p>
                <p className="text-xs mt-1">Crie sua primeira meta para acompanhar seus investimentos e reservas!</p>
              </div>
            ) : (
              goals.map(goal => {
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

                    {/* Recent History snippet */}
                    {goal.history && goal.history.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Último movimento:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {goal.history[0].type === 'deposit' ? '+ ' : '- '}
                          {formatCurrency(goal.history[0].amount)} em {formatDateShort(goal.history[0].date)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
