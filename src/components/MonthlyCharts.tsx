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
  const [showDetailedCards, setShowDetailedCards] = useState(false);

  // Category breakdown for expenses
  const categorySpending = useMemo(() => {
    return calculateCategorySpending(transactions, budgets, 'expense', categories);
  }, [transactions, budgets, categories]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalBudgetLimit = useMemo(() => {
    return budgets.reduce((acc, b) => acc + b.limit, 0);
  }, [budgets]);

  const isBudgetExceeded = totalBudgetLimit > 0 && totalExpense > totalBudgetLimit;

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
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-slate-200/80 dark:border-white/10 shadow-xs p-5 sm:p-6 flex flex-col items-center justify-center text-center min-h-[220px]">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mb-2">
          <PieChart className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Nenhuma despesa no período</h4>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-xs">
          Cadastre novos lançamentos para visualizar a distribuição por categorias e evolução diária.
        </p>
      </div>
    );
  }

  return (
    <div id="section-monthly-charts" className="bg-white dark:bg-zinc-900 rounded-[28px] border border-slate-200/80 dark:border-white/10 shadow-xs p-5 sm:p-6 flex flex-col justify-between flex-1 transition-all">
      
      {/* Header with Segmented Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {activeTab === 'categories' ? 'Distribuição de Despesas' : activeTab === 'daily' ? 'Evolução Diária' : 'Formas de Pagamento'}
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            {activeTab === 'categories' ? `${categorySpending.length} categorias` : activeTab === 'daily' ? 'Ritmo diário de gastos' : 'Meios de pagamento utilizados'}
          </p>
        </div>

        {/* Tab Buttons Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-zinc-800 rounded-full border border-slate-200/60 dark:border-white/5 text-xs font-semibold self-start sm:self-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Por Categoria
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'daily'
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Evolução Diária
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pagamento
          </button>
        </div>
      </div>

      {/* TAB 1: Categories Breakdown (Executive Donut + Category Legend & Progressive Detail) */}
      {activeTab === 'categories' && (
        <div className="pt-4 flex flex-col justify-between flex-1 space-y-4">
          
          {/* Executive Donut + Category Legend Side-by-Side (as in mockup) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-auto">
            
            {/* Donut Graphic */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" className="text-slate-100 dark:text-zinc-800" strokeWidth="14" />
                {donutSegments.map(segment => {
                  const isHovered = hoveredCategory === segment.category.id;
                  return (
                    <circle
                      key={segment.category.id}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={isHovered ? 16 : 14}
                      strokeDasharray={segment.strokeDasharray}
                      strokeDashoffset={segment.strokeDashoffset}
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredCategory(segment.category.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  );
                })}
              </svg>

              {/* Center Cutout Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500">
                  {hoveredCategory 
                    ? categorySpending.find(c => c.category.id === hoveredCategory)?.category.name 
                    : 'DESPESAS'}
                </span>
                <span className="text-base sm:text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {hoveredCategory
                    ? formatCurrency(categorySpending.find(c => c.category.id === hoveredCategory)?.total || 0)
                    : formatCurrency(totalExpense)}
                </span>
                {hoveredCategory && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {(categorySpending.find(c => c.category.id === hoveredCategory)?.percentage || 0).toFixed(1)}% do total
                  </span>
                )}
              </div>
            </div>

            {/* Category Legend List */}
            <div className="w-full space-y-1.5">
              {categorySpending.slice(0, 6).map(item => {
                const isHovered = hoveredCategory === item.category.id;
                return (
                  <div
                    key={item.category.id}
                    onMouseEnter={() => setHoveredCategory(item.category.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={`flex items-center justify-between text-xs sm:text-sm px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      isHovered 
                        ? 'bg-slate-100 dark:bg-white/10 font-bold' 
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: item.category.color }} 
                      />
                      <span className="text-slate-700 dark:text-zinc-300 truncate font-medium">
                        {item.category.name}
                      </span>
                    </div>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Toggle for Detailed Category Cards with Progress Bars */}
          <div className="pt-1">
            <button
              onClick={() => setShowDetailedCards(!showDetailedCards)}
              className="text-xs text-slate-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{showDetailedCards ? 'Ocultar tetos detalhados' : 'Ver progresso de tetos por categoria'}</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showDetailedCards ? 'rotate-90' : ''}`} />
            </button>

            {showDetailedCards && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                {categorySpending.map(item => {
                  const hasBudget = Boolean(item.budgetLimit && item.budgetLimit > 0);
                  const isOverBudget = Boolean(hasBudget && item.budgetPercentage && item.budgetPercentage > 100);
                  const isHovered = hoveredCategory === item.category.id;

                  return (
                    <div 
                      key={item.category.id}
                      onMouseEnter={() => setHoveredCategory(item.category.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isHovered
                          ? 'border-emerald-500/50 bg-white dark:bg-black/60 shadow-sm'
                          : 'border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-black/40 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
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
                          <div className="text-xs sm:text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(item.total)}
                          </div>
                          {hasBudget ? (
                            <div className={`text-[10px] font-semibold ${isOverBudget ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                              {item.budgetPercentage?.toFixed(0)}% da meta
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                              {item.percentage.toFixed(1)}% do total
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Unified progress bar */}
                      <div className="w-full bg-slate-200/80 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            hasBudget && isOverBudget ? 'bg-rose-500' : ''
                          }`}
                          style={{ 
                            width: `${Math.min(100, hasBudget ? (item.budgetPercentage || 0) : item.percentage)}%`,
                            backgroundColor: (hasBudget && isOverBudget) ? undefined : item.category.color 
                          }}
                        />
                      </div>

                      {/* Budget comparison or action */}
                      {hasBudget ? (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">
                            Teto: <strong className="tabular-nums text-slate-700 dark:text-slate-300 font-bold">{formatCurrency(item.budgetLimit!)}</strong>
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
                      ) : (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 dark:text-slate-500 italic">
                            Sem meta definida
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenBudgets();
                            }}
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                          >
                            Definir meta
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with Budget Summary and Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span>
              Teto total: <strong className="text-slate-800 dark:text-zinc-200 tabular-nums">{formatCurrency(totalBudgetLimit)}</strong>
              {totalBudgetLimit > 0 && (
                <span className={`ml-2 font-bold ${isBudgetExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {isBudgetExceeded ? `+${((totalExpense / totalBudgetLimit - 1) * 100).toFixed(0)}% acima` : `${formatCurrency(totalBudgetLimit - totalExpense)} disponível`}
                </span>
              )}
            </span>
            <button
              onClick={onOpenBudgets}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              Gerenciar tetos
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
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-black/50 p-0.5 border border-slate-200 dark:border-white/10">
                <button
                  onClick={() => setChartSubView('area')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    chartSubView === 'area'
                      ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Curva Suave
                </button>
                <button
                  onClick={() => setChartSubView('bars')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    chartSubView === 'bars'
                      ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-xs'
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
            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-black/40 border border-slate-100 dark:border-white/10 relative overflow-hidden">
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
                  <line x1="0" y1="35" x2={areaChartData.width} y2="35" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-zinc-800/80" strokeWidth="1" />
                  <line x1="0" y1="75" x2={areaChartData.width} y2="75" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-zinc-800/80" strokeWidth="1" />
                  <line x1="0" y1="115" x2={areaChartData.width} y2="115" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-zinc-800/80" strokeWidth="1" />

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
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900 dark:bg-[#121214] text-white text-[11px] px-3 py-1 rounded-lg font-mono-num shadow-lg border border-slate-700 dark:border-white/15 flex items-center gap-1.5 z-20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Dia {hoveredDay.day}: {formatCurrency(hoveredDay.amount)}
                  </div>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono-num pt-2 border-t border-slate-200/80 dark:border-white/10">
                <span>Dia 1</span>
                <span>Dia 8</span>
                <span>Dia 15</span>
                <span>Dia 22</span>
                <span>Dia {dailySpending.daysInMonth}</span>
              </div>
            </div>
          ) : (
            /* SubView 2: Classic Capsule Bars */
            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-black/40 border border-slate-100 dark:border-white/10 overflow-hidden">
              <div className="h-44 w-full flex items-end gap-1 sm:gap-1.5 pt-4 pb-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto">
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
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900 dark:bg-[#121214] text-white text-[10px] py-0.5 px-1.5 rounded-md font-mono-num whitespace-nowrap shadow-md border border-transparent dark:border-white/15">
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
                            : 'bg-slate-200 dark:bg-zinc-800 h-1 rounded-full'
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
              className="p-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50/60 dark:bg-black/40 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:shadow-xs transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs">
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
