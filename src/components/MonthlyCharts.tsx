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
  Sparkles,
  Layers
} from 'lucide-react';
import { Transaction, CategoryBudget, CategorySpending, MonthPeriod, Category } from '../types';
import { calculateCategorySpending } from '../utils/storage';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { PAYMENT_METHODS } from '../utils/constants';

interface MonthlyChartsProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  period: MonthPeriod;
  onOpenBudgets: () => void;
  categories?: Category[];
}

export const MonthlyCharts: React.FC<MonthlyChartsProps> = ({
  transactions,
  budgets,
  period,
  onOpenBudgets,
  categories,
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'daily' | 'payments'>('categories');
  const [chartSubView, setChartSubView] = useState<'area' | 'bars'>('area');
  const [hoveredDay, setHoveredDay] = useState<{ day: number; amount: number; count: number } | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Category breakdown for expenses
  const categorySpending = useMemo(() => {
    return calculateCategorySpending(transactions, budgets, 'expense', categories);
  }, [transactions, budgets, categories]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Donut chart calculations
  const donutSegments = useMemo(() => {
    if (totalExpense === 0) return [];
    const radius = 38;
    const circumference = 2 * Math.PI * radius; // ~238.76
    let accumulatedAngle = 0;

    return categorySpending.map(item => {
      const fraction = item.total / totalExpense;
      const strokeDasharray = `${fraction * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle;
      accumulatedAngle += fraction * circumference;

      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
        color: item.category.color,
      };
    });
  }, [categorySpending, totalExpense]);

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

  // Bézier Area Chart points and path generator
  const areaChartData = useMemo(() => {
    const { days, maxAmount, daysInMonth } = dailySpending;
    const width = 600;
    const height = 150;
    const paddingX = 15;
    const paddingY = 20;
    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    const points = days.map((d, index) => {
      const x = paddingX + (index / (daysInMonth - 1 || 1)) * usableWidth;
      const y = height - paddingY - (d.amount / maxAmount) * usableHeight;
      return { x, y, day: d.day, amount: d.amount, count: d.count };
    });

    if (points.length === 0) return { pathD: '', areaD: '', points: [] };

    // Build smooth cubic Bézier curve
    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      pathD += ` C ${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`;
    }

    const last = points[points.length - 1];
    const first = points[0];
    const areaD = `${pathD} L ${last.x},${height} L ${first.x},${height} Z`;

    return { pathD, areaD, points, width, height };
  }, [dailySpending]);

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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs dark:shadow-2xl p-5 mb-6 transition-all duration-300">
      
      {/* Header with Segmented Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            Análise & Demonstrações Visuais
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Distribuição por categorias, fluxo diário de saídas e formas de pagamento
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
            <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
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

      {/* TAB 1: Categories Breakdown (Donut Chart + Executive Grid) */}
      {activeTab === 'categories' && (
        <div className="pt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Modern Donut Chart Component (5 cols) */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-200/80 dark:text-slate-700/60" />
                  
                  {/* Category Donut Segments */}
                  {donutSegments.map(segment => {
                    const isHovered = hoveredCategory === segment.category.id;
                    return (
                      <circle
                        key={segment.category.id}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={segment.color}
                        strokeWidth={isHovered ? 16 : 12}
                        strokeDasharray={segment.strokeDasharray}
                        strokeDashoffset={segment.strokeDashoffset}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredCategory(segment.category.id)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      />
                    );
                  })}
                </svg>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {hoveredCategory 
                      ? categorySpending.find(c => c.category.id === hoveredCategory)?.category.name 
                      : 'Despesas'}
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-mono-num tracking-tight">
                    {hoveredCategory
                      ? formatCurrency(categorySpending.find(c => c.category.id === hoveredCategory)?.total || 0)
                      : formatCurrency(totalExpense)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    {hoveredCategory
                      ? `${(categorySpending.find(c => c.category.id === hoveredCategory)?.percentage || 0).toFixed(1)}%`
                      : `${categorySpending.length} categorias`}
                  </span>
                </div>
              </div>

              <span className="text-[11px] text-slate-400 mt-3 text-center">
                Passe o cursor sobre os anéis ou categorias
              </span>
            </div>

            {/* Category Cards with Progress Bars (8 cols) */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categorySpending.map(item => {
                const hasBudget = item.budgetLimit && item.budgetLimit > 0;
                const isOverBudget = item.budgetPercentage && item.budgetPercentage > 100;
                const isHovered = hoveredCategory === item.category.id;

                return (
                  <div 
                    key={item.category.id}
                    onMouseEnter={() => setHoveredCategory(item.category.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isHovered
                        ? 'border-emerald-500/50 bg-white dark:bg-slate-800 shadow-sm'
                        : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs border"
                          style={{
                            backgroundColor: `${item.category.color}15`,
                            borderColor: `${item.category.color}35`,
                            color: item.category.color
                          }}
                        >
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
                    <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full h-1.5 overflow-hidden">
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
                          Teto: <strong className="font-mono-num text-slate-700 dark:text-slate-300 font-bold">{formatCurrency(item.budgetLimit!)}</strong>
                        </span>
                        {isOverBudget ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            +{(item.budgetPercentage! - 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                            {(item.budgetPercentage!).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

          <div className="pt-1 text-right">
            <button
              onClick={onOpenBudgets}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              Gerenciar tetos orçamentários por categoria
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Daily Evolution (Smoothed Bézier Area Chart + Bars Mode) */}
      {activeTab === 'daily' && (
        <div className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>Ritmo e picos de despesas ao longo do mês</span>
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setChartSubView('area')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    chartSubView === 'area'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Curva Suave
                </button>
                <button
                  onClick={() => setChartSubView('bars')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    chartSubView === 'bars'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Barras
                </button>
              </div>
            </div>

            {hoveredDay && hoveredDay.amount > 0 ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono-num bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Dia {hoveredDay.day}: {formatCurrency(hoveredDay.amount)} ({hoveredDay.count} compras)
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Toque ou passe o cursor sobre os pontos</span>
            )}
          </div>

          {/* SubView 1: Smooth Bézier Area Chart */}
          {chartSubView === 'area' ? (
            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 relative">
              <div className="h-44 w-full relative">
                <svg 
                  className="w-full h-full overflow-visible" 
                  viewBox={`0 0 ${areaChartData.width} ${areaChartData.height}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="bezierAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="70%" stopColor="#10b981" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid guide lines */}
                  <line x1="0" y1="35" x2={areaChartData.width} y2="35" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                  <line x1="0" y1="75" x2={areaChartData.width} y2="75" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                  <line x1="0" y1="115" x2={areaChartData.width} y2="115" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />

                  {/* Shaded Area */}
                  {areaChartData.areaD && (
                    <path d={areaChartData.areaD} fill="url(#bezierAreaGrad)" />
                  )}

                  {/* Bézier Stroke Line */}
                  {areaChartData.pathD && (
                    <path 
                      d={areaChartData.pathD} 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  )}

                  {/* Interactive Points on curve */}
                  {areaChartData.points.map(pt => {
                    if (pt.amount === 0) return null;
                    const isHovered = hoveredDay?.day === pt.day;
                    return (
                      <g key={pt.day} className="cursor-pointer">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : 4}
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all duration-150"
                          onMouseEnter={() => setHoveredDay({ day: pt.day, amount: pt.amount, count: pt.count })}
                          onMouseLeave={() => setHoveredDay(null)}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Live Tooltip popup if day is hovered */}
                {hoveredDay && hoveredDay.amount > 0 && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900 text-white text-[11px] px-3 py-1 rounded-lg font-mono-num shadow-lg border border-slate-700 flex items-center gap-1.5 z-20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Dia {hoveredDay.day}: {formatCurrency(hoveredDay.amount)}
                  </div>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono-num pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <span>Dia 1</span>
                <span>Dia 8</span>
                <span>Dia 15</span>
                <span>Dia 22</span>
                <span>Dia {dailySpending.daysInMonth}</span>
              </div>
            </div>
          ) : (
            /* SubView 2: Classic Capsule Bars */
            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
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
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded-md font-mono-num whitespace-nowrap shadow-md">
                          {formatCurrency(d.amount)}
                        </div>
                      )}

                      {/* Capsule Bar */}
                      <div
                        className={`w-full rounded-t-sm transition-all duration-200 ${
                          d.amount > 0
                            ? isToday
                              ? 'bg-emerald-600 ring-2 ring-emerald-400/50'
                              : 'bg-emerald-500/80 hover:bg-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-700 h-1 rounded-full'
                        }`}
                        style={{ height: d.amount > 0 ? `${heightPercent}%` : '3px' }}
                      />

                      {/* Day label */}
                      <span className={`text-[9px] sm:text-[10px] mt-1.5 font-mono-num font-semibold ${
                        isToday ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
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
