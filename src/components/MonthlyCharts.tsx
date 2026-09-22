import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  BarChart3, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  CreditCard,
  ChevronRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Transaction, CategoryBudget, CategorySpending, MonthPeriod } from '../types';
import { calculateCategorySpending } from '../utils/storage';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { PAYMENT_METHODS } from '../utils/constants';

interface MonthlyChartsProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  period: MonthPeriod;
  onOpenBudgets: () => void;
}

export const MonthlyCharts: React.FC<MonthlyChartsProps> = ({
  transactions,
  budgets,
  period,
  onOpenBudgets,
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'daily' | 'payments'>('categories');
  const [hoveredDay, setHoveredDay] = useState<{ day: number; amount: number; count: number } | null>(null);

  // Category breakdown for expenses
  const categorySpending = useMemo(() => {
    return calculateCategorySpending(transactions, budgets, 'expense');
  }, [transactions, budgets]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Daily spending aggregation
  const dailySpending = useMemo(() => {
    const daysInMonth = new Date(period.year, period.month + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: 0,
      count: 0,
    }));

    for (const t of transactions) {
      if (t.type === 'expense' && t.date) {
        const parts = t.date.split('-');
        if (parts.length === 3) {
          const day = parseInt(parts[2], 10);
          if (day >= 1 && day <= daysInMonth) {
            daysArray[day - 1].amount += t.amount;
            daysArray[day - 1].count += 1;
          }
        }
      }
    }

    const maxAmount = Math.max(...daysArray.map(d => d.amount), 100);
    return { days: daysArray, maxAmount, daysInMonth };
  }, [transactions, period]);

  // Payment methods breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === 'expense') {
        map[t.paymentMethod] = (map[t.paymentMethod] || 0) + t.amount;
      }
    }

    return PAYMENT_METHODS.map(pm => {
      const amount = map[pm.id] || 0;
      const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      return {
        ...pm,
        amount,
        percentage,
      };
    })
      .filter(pm => pm.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, totalExpense]);

  if (totalExpense === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-5 mb-6 transition-all">
      
      {/* Header with segmented pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            Análise Visual & Tendências
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compreenda a distribuição de despesas e os dias com maiores gastos
          </p>
        </div>

        {/* Tab Buttons Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/70 dark:border-slate-700/70 self-start sm:self-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Por Categoria
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Evolução Diária
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Formas de Pagamento
          </button>
        </div>
      </div>

      {/* TAB 1: Categories Breakdown */}
      {activeTab === 'categories' && (
        <div className="pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categorySpending.map(item => {
              const hasBudget = item.budgetLimit && item.budgetLimit > 0;
              const isOverBudget = item.budgetPercentage && item.budgetPercentage > 100;

              return (
                <div 
                  key={item.category.id}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-xs shrink-0 ${item.category.bgLight} dark:bg-slate-800 dark:border-slate-700`}>
                        <CategoryIcon name={item.category.icon} className="w-4 h-4" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.category.name}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-extrabold font-mono-num text-slate-900 dark:text-white">
                        {formatCurrency(item.total)}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        {item.percentage.toFixed(1)}% do total
                      </div>
                    </div>
                  </div>

                  {/* Relative visual bar against total spending */}
                  <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, item.percentage)}%`,
                        backgroundColor: item.category.color 
                      }}
                    />
                  </div>

                  {/* Budget comparison if configured */}
                  {hasBudget && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Meta: <strong className="font-mono-num text-slate-700 dark:text-slate-300 font-bold">{formatCurrency(item.budgetLimit!)}</strong>
                      </span>
                      {isOverBudget ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Estourou {(item.budgetPercentage! - 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          {(item.budgetPercentage!).toFixed(0)}% da meta
                        </span>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          <div className="pt-2 text-right">
            <button
              onClick={onOpenBudgets}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              Ajustar orçamentos por categoria
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Daily Evolution Bar Chart */}
      {activeTab === 'daily' && (
        <div className="pt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
            <span>Ritmo diário de despesas (dias 1 a {dailySpending.daysInMonth})</span>
            {hoveredDay && hoveredDay.amount > 0 ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono-num bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Dia {hoveredDay.day}: {formatCurrency(hoveredDay.amount)} ({hoveredDay.count} compras)
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Passe o cursor sobre as barras</span>
            )}
          </div>

          {/* Responsive bar chart */}
          <div className="h-44 w-full flex items-end gap-1 sm:gap-1.5 pt-4 pb-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            {dailySpending.days.map(d => {
              const heightPercent = d.amount > 0 ? Math.max(8, (d.amount / dailySpending.maxAmount) * 100) : 0;
              const isToday = new Date().getDate() === d.day && 
                new Date().getMonth() === period.month && 
                new Date().getFullYear() === period.year;

              return (
                <div
                  key={d.day}
                  onMouseEnter={() => setHoveredDay(d)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className="flex-1 min-w-[12px] sm:min-w-[16px] flex flex-col items-center justify-end h-full group cursor-pointer relative"
                >
                  {/* Tooltip on hover */}
                  {d.amount > 0 && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-9 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg font-mono-num whitespace-nowrap shadow-lg">
                      {formatCurrency(d.amount)}
                    </div>
                  )}

                  {/* Capsule Bar */}
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      d.amount > 0
                        ? isToday
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400 ring-2 ring-emerald-400/50'
                          : 'bg-emerald-500/80 dark:bg-emerald-500 hover:bg-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 h-1 rounded-full'
                    }`}
                    style={{ height: d.amount > 0 ? `${heightPercent}%` : '4px' }}
                  />

                  {/* Day label */}
                  <span className={`text-[9px] sm:text-[10px] mt-1.5 font-mono-num font-semibold ${
                    isToday ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                  }`}>
                    {d.day % 2 !== 0 || dailySpending.daysInMonth <= 15 ? d.day : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            <span>Início do mês (Dia 1)</span>
            <span>Meio do mês (Dia 15)</span>
            <span>Fim do mês (Dia {dailySpending.daysInMonth})</span>
          </div>
        </div>
      )}

      {/* TAB 3: Payment Methods */}
      {activeTab === 'payments' && (
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {paymentBreakdown.map(pm => (
            <div 
              key={pm.id}
              className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:shadow-xs transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs">
                  <CategoryIcon name={pm.icon} className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {pm.label}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-num font-semibold">
                    {pm.percentage.toFixed(1)}% dos gastos
                  </span>
                </div>
              </div>

              <div className="text-right font-mono-num font-extrabold text-sm text-slate-900 dark:text-white">
                {formatCurrency(pm.amount)}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
