import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  BarChart3, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  CreditCard,
  ChevronRight
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6">
      
      {/* Header with visual tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Análise Visual dos Gastos
          </h3>
          <p className="text-xs text-slate-500">
            Acompanhe onde seu dinheiro foi investido e o ritmo das despesas
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto text-xs">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'categories'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-emerald-600" />
            Por Categoria
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'daily'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            Evolução Diária
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
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
              const isWarning = item.budgetPercentage && item.budgetPercentage >= 85 && !isOverBudget;

              return (
                <div 
                  key={item.category.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${item.category.bgLight}`}>
                        <CategoryIcon name={item.category.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                        {item.category.name}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-bold font-mono-num text-slate-900">
                        {formatCurrency(item.total)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {item.percentage.toFixed(1)}% do total
                      </div>
                    </div>
                  </div>

                  {/* Relative visual bar against total spending */}
                  <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, item.percentage)}%`,
                        backgroundColor: item.category.color 
                      }}
                    />
                  </div>

                  {/* Budget comparison if configured */}
                  {hasBudget && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Meta: <strong className="font-mono-num text-slate-700">{formatCurrency(item.budgetLimit!)}</strong>
                      </span>
                      {isOverBudget ? (
                        <span className="text-rose-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Estourou {(item.budgetPercentage! - 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">
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
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              Configurar metas por categoria
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Daily Evolution Bar Chart */}
      {activeTab === 'daily' && (
        <div className="pt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
            <span>Distribuição dos gastos ao longo do mês (dias 1 a {dailySpending.daysInMonth})</span>
            {hoveredDay && hoveredDay.amount > 0 && (
              <span className="font-semibold text-emerald-700 font-mono-num">
                Dia {hoveredDay.day}: {formatCurrency(hoveredDay.amount)} ({hoveredDay.count} transação/ões)
              </span>
            )}
          </div>

          {/* SVG/CSS responsive bar chart */}
          <div className="h-44 w-full flex items-end gap-1 sm:gap-1.5 pt-4 pb-2 border-b border-slate-200 overflow-x-auto">
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
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900 text-white text-[10px] py-0.5 px-2 rounded font-mono-num whitespace-nowrap shadow-md">
                      {formatCurrency(d.amount)}
                    </div>
                  )}

                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-sm transition-all duration-200 ${
                      d.amount > 0
                        ? isToday
                          ? 'bg-emerald-600 group-hover:bg-emerald-700'
                          : 'bg-emerald-500/80 group-hover:bg-emerald-600'
                        : 'bg-slate-100 h-1'
                    }`}
                    style={{ height: d.amount > 0 ? `${heightPercent}%` : '4px' }}
                  />

                  {/* Day label */}
                  <span className={`text-[9px] sm:text-[10px] mt-1 font-mono-num ${
                    isToday ? 'font-bold text-emerald-700' : 'text-slate-400 group-hover:text-slate-700'
                  }`}>
                    {d.day % 2 !== 0 || dailySpending.daysInMonth <= 15 ? d.day : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Início do mês</span>
            <span>Meio do mês</span>
            <span>Fim do mês</span>
          </div>
        </div>
      )}

      {/* TAB 3: Payment Methods */}
      {activeTab === 'payments' && (
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {paymentBreakdown.map(pm => (
            <div 
              key={pm.id}
              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                  <CategoryIcon name={pm.icon} className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    {pm.label}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono-num font-bold">
                    {pm.percentage.toFixed(1)}% das despesas
                  </span>
                </div>
              </div>

              <div className="text-right font-mono-num font-bold text-sm text-slate-900">
                {formatCurrency(pm.amount)}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
