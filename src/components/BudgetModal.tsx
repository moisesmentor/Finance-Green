import React, { useState, useEffect } from 'react';
import { X, Target, Check, AlertTriangle } from 'lucide-react';
import { CategoryBudget, Transaction, Category } from '../types';
import { CATEGORIES } from '../utils/constants';
import { CategoryIcon } from './CategoryIcon';
import { formatCurrency } from '../utils/formatters';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudgets: CategoryBudget[];
  onSaveBudgets: (budgets: CategoryBudget[]) => void;
  transactionsThisMonth: Transaction[];
  categories?: Category[];
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  currentBudgets,
  onSaveBudgets,
  transactionsThisMonth,
  categories,
}) => {
  const [budgetValues, setBudgetValues] = useState<Record<string, string>>({});

  const expenseCategories = (categories || CATEGORIES).filter(c => c.type === 'expense');

  // Compute spent amount per category this month
  const categorySpentMap: Record<string, number> = {};
  for (const t of transactionsThisMonth) {
    if (t.type === 'expense') {
      categorySpentMap[t.categoryId] = (categorySpentMap[t.categoryId] || 0) + t.amount;
    }
  }

  useEffect(() => {
    const initialMap: Record<string, string> = {};
    for (const cat of expenseCategories) {
      const found = currentBudgets.find(b => b.categoryId === cat.id);
      initialMap[cat.id] = found && found.limit > 0 ? found.limit.toString() : '';
    }
    setBudgetValues(initialMap);
  }, [currentBudgets, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (catId: string, val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    setBudgetValues(prev => ({ ...prev, [catId]: clean }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CategoryBudget[] = [];

    for (const [catId, val] of Object.entries(budgetValues)) {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        updated.push({ categoryId: catId, limit: Math.round(num * 100) / 100 });
      }
    }

    onSaveBudgets(updated);
    onClose();
  };

  // Total budgeted sum
  const totalBudgeted = Object.values(budgetValues).reduce((acc, val) => {
    const num = parseFloat(val);
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  const totalSpent = Object.values(categorySpentMap).reduce((acc, val) => acc + val, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-budgets"
        className="bg-white dark-brushed-metal-modal rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/60 dark-glow-emerald">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Metas de Gastos e Orçamento
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Defina tetos mensais por categoria para evitar imprevistos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Bar */}
        <div className="bg-slate-50 dark:bg-black/40 px-6 py-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Gasto total no mês:</span>{' '}
            <strong className="text-rose-600 dark:text-rose-400 font-mono-num font-bold">{formatCurrency(totalSpent)}</strong>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Teto total estipulado:</span>{' '}
            <strong className="text-emerald-700 dark:text-emerald-400 font-mono-num font-bold">{formatCurrency(totalBudgeted)}</strong>
          </div>
        </div>

        {/* Form list */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-3">
            {expenseCategories.map(cat => {
              const spent = categorySpentMap[cat.id] || 0;
              const limitStr = budgetValues[cat.id] || '';
              const limitNum = parseFloat(limitStr) || 0;
              const hasLimit = limitNum > 0;
              const percent = hasLimit ? (spent / limitNum) * 100 : 0;
              const isOver = percent > 100;
              const isWarning = percent >= 85 && !isOver;

              return (
                <div 
                  key={cat.id} 
                  className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark-subcard hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    
                    {/* Category Label */}
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cat.bgLight} dark:bg-white/5 dark:border-white/10`}>
                        <CategoryIcon name={cat.icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {cat.name}
                        </span>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Gasto atual: <span className="font-mono-num font-medium text-slate-700 dark:text-slate-300">{formatCurrency(spent)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Limit Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Meta: R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={limitStr}
                        onChange={e => handleInputChange(cat.id, e.target.value)}
                        placeholder="Ex: 800"
                        className="w-28 px-2.5 py-1.5 text-xs sm:text-sm font-mono-num font-semibold text-right rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                      />
                    </div>

                  </div>

                  {/* Progress bar if has limit */}
                  {hasLimit && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {percent.toFixed(0)}% utilizado
                        </span>
                        {isOver ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Excedeu em {formatCurrency(spent - limitNum)}
                          </span>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300">
                            Resta: <strong className="font-mono-num text-emerald-700 dark:text-emerald-400">{formatCurrency(limitNum - spent)}</strong>
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-black/50 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/10 sticky bottom-0 bg-white dark:bg-[#131417]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-budgets-submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs dark-glow-emerald transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Salvar Metas
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
