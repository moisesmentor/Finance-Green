import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  BarChart3, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  CreditCard,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Sparkles,
  Layers,
  AlertTriangle
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
  onSelectCategory?: (categoryId: string) => void;
  hideValues?: boolean;
}

export const MonthlyCharts: React.FC<MonthlyChartsProps> = ({
  transactions,
  budgets,
  period,
  onOpenBudgets,
  categories,
  onSelectCategory,
  hideValues = false,
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'daily' | 'payments'>('categories');
  const [chartSubView, setChartSubView] = useState<'area' | 'bars'>('area');
  const [hoveredDay, setHoveredDay] = useState<{ day: number; amount: number; count: number } | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [showDetailedCards, setShowDetailedCards] = useState(false);
  const [isOtherExpanded, setIsOtherExpanded] = useState(false);

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

  // 1. Despesas ativas ordenadas por valor decrescente
  const activeExpenseSpending = useMemo(() => {
    return categorySpending
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [categorySpending]);

  // 2. Frase-resumo inteligente e humana (Regra aprovada na Fase 1)
  const summaryPhrase = useMemo(() => {
    if (totalExpense === 0 || activeExpenseSpending.length === 0) {
      return 'Nenhuma despesa registrada neste período.';
    }
    if (activeExpenseSpending.length === 1) {
      return `${activeExpenseSpending[0].category.name} representa 100% dos seus gastos deste mês.`;
    }

    const cat1 = activeExpenseSpending[0];
    const cat2 = activeExpenseSpending[1];
    const cat3 = activeExpenseSpending[2];

    if (cat1.percentage >= 50) {
      return `${cat1.category.name} concentra ${cat1.percentage.toFixed(0)}% dos seus gastos deste mês.`;
    }
    if (cat2 && cat1.percentage + cat2.percentage >= 50) {
      return `${cat1.category.name} e ${cat2.category.name} concentram ${(cat1.percentage + cat2.percentage).toFixed(0)}% dos seus gastos deste mês.`;
    }
    if (cat3 && cat1.percentage + cat2.percentage + cat3.percentage >= 50) {
      return `${cat1.category.name}, ${cat2.category.name} e ${cat3.category.name} concentram ${(cat1.percentage + cat2.percentage + cat3.percentage).toFixed(0)}% dos seus gastos deste mês.`;
    }

    return 'Seus gastos estão bem distribuídos entre as categorias neste mês.';
  }, [totalExpense, activeExpenseSpending]);

  // 3. Agrupamento: Top 5 maiores categorias + "Outras (N)" para fatias < 3% ou além do 5º lugar
  const { displayCategories, otherCategories, hasOther } = useMemo(() => {
    if (activeExpenseSpending.length <= 5) {
      const smallSlices = activeExpenseSpending.filter(item => item.percentage < 3);
      if (smallSlices.length === 0 || activeExpenseSpending.length <= 3) {
        return {
          displayCategories: activeExpenseSpending,
          otherCategories: [],
          hasOther: false,
        };
      }
    }

    const top: CategorySpending[] = [];
    const others: CategorySpending[] = [];

    activeExpenseSpending.forEach((item, index) => {
      if (index < 5 && item.percentage >= 3) {
        top.push(item);
      } else {
        others.push(item);
      }
    });

    if (others.length === 0) {
      return {
        displayCategories: top,
        otherCategories: [],
        hasOther: false,
      };
    }

    const otherTotal = others.reduce((sum, item) => sum + item.total, 0);
    const otherPercentage = totalExpense > 0 ? (otherTotal / totalExpense) * 100 : 0;

    const otherItem: CategorySpending & { subItems?: CategorySpending[] } = {
      category: {
        id: '__other__',
        name: `Outras (${others.length})`,
        icon: 'MoreHorizontal',
        color: '#64748b',
        type: 'expense',
      },
      total: otherTotal,
      percentage: otherPercentage,
      transactionCount: others.reduce((sum, item) => sum + item.transactionCount, 0),
      subItems: others,
    };

    return {
      displayCategories: [...top, otherItem],
      otherCategories: others,
      hasOther: true,
    };
  }, [activeExpenseSpending, totalExpense]);

  // 4. Rosca com fatias arredondadas e pequenos vãos
  const donutSegments = useMemo(() => {
    if (totalExpense === 0 || displayCategories.length === 0) return [];
    const radius = 38;
    const circumference = 2 * Math.PI * radius; // ~238.761
    let accumulatedAngle = 0;
    const gapAngle = displayCategories.length > 1 ? 1.5 : 0;

    return displayCategories.map(item => {
      const fraction = item.total / totalExpense;
      const rawLength = fraction * circumference;
      const dashLength = Math.max(0.5, rawLength - gapAngle);
      const strokeDasharray = `${dashLength} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle;
      accumulatedAngle += rawLength;

      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
        color: item.category.color,
      };
    });
  }, [displayCategories, totalExpense]);

  // Item ativo em hover para exibir no centro da rosca
  const activeHoveredItem = useMemo(() => {
    if (!hoveredCategory) return null;
    return displayCategories.find(c => c.category.id === hoveredCategory) ||
      otherCategories.find(c => c.category.id === hoveredCategory) ||
      null;
  }, [hoveredCategory, displayCategories, otherCategories]);

  // Agregação de evolução diária
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

  // Bézier Area Chart
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

  // Formas de pagamento
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

  // Cálculos do teto orçamentário para o rodapé
  const percentageUsed = totalBudgetLimit > 0 ? (totalExpense / totalBudgetLimit) * 100 : 0;
  const isBudgetExceeded = totalBudgetLimit > 0 && totalExpense > totalBudgetLimit;
  const isWarningBudget = totalBudgetLimit > 0 && !isBudgetExceeded && percentageUsed >= 85;
  const remainingBudget = Math.max(0, totalBudgetLimit - totalExpense);

  const handleCategoryClick = (catId: string) => {
    if (catId === '__other__') {
      setIsOtherExpanded(prev => !prev);
      return;
    }
    if (onSelectCategory) {
      onSelectCategory(catId);
    } else {
      const el = document.getElementById('section-transaction-list');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Caso especial: Mês sem despesas
  if (totalExpense === 0) {
    return (
      <div 
        id="section-monthly-charts"
        className="bg-white/95 dark:bg-black/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[260px] transition-all"
      >
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-3 shadow-xs">
          <PieChart className="w-6 h-6 stroke-[2]" />
        </div>
        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
          Nenhuma despesa no período
        </h4>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm">
          Cadastre novos lançamentos para visualizar a distribuição por categorias, evolução diária e formas de pagamento.
        </p>
      </div>
    );
  }

  return (
    <div 
      id="section-monthly-charts" 
      className="bg-white/95 dark:bg-black/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs dark:shadow-2xl dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-5 sm:p-7 flex flex-col justify-between flex-1 transition-all"
      role="region"
      aria-label="Distribuição de Despesas e Análise Mensal"
    >
      
      {/* Header com Segmented Control e Frase-Resumo Humana */}
      <div className="space-y-3 pb-5 border-b border-slate-200/60 dark:border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {activeTab === 'categories' ? 'Distribuição de Despesas' : activeTab === 'daily' ? 'Evolução Diária' : 'Formas de Pagamento'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {activeTab === 'categories' 
                ? `${activeExpenseSpending.length} ${activeExpenseSpending.length === 1 ? 'categoria ativa' : 'categorias com movimentações'}` 
                : activeTab === 'daily' 
                  ? 'Ritmo e picos de gastos ao longo do mês' 
                  : 'Meios de pagamento utilizados'}
            </p>
          </div>

          {/* Abas Seguras com Foco Acessível */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-100/90 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/5 text-xs font-semibold self-start sm:self-auto overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                activeTab === 'categories'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Por Categoria
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                activeTab === 'daily'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Evolução Diária
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                activeTab === 'payments'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Formas de pagamento
            </button>
          </div>
        </div>

        {/* Frase-Resumo Humana (Apenas na aba de categorias) */}
        {activeTab === 'categories' && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/[0.08] border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
            <span className="text-emerald-500 text-sm shrink-0">💡</span>
            <span className="font-medium leading-relaxed">
              {summaryPhrase}
            </span>
          </div>
        )}
      </div>

      {/* ABA 1: Distribuição de Despesas (Rosca Refinada + Legenda Agrupada + Frase) */}
      {activeTab === 'categories' && (
        <div className="pt-5 flex flex-col justify-between flex-1 space-y-6">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 my-auto">
            
            {/* Rosca com Anel Refinado e Centro Dinâmico */}
            <div className="relative w-52 h-52 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                {/* Background Ring */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  fill="none" 
                  stroke="currentColor" 
                  className="text-slate-100 dark:text-white/5" 
                  strokeWidth="10" 
                />
                
                {/* Segmentos Dinâmicos com Pontas Arredondadas */}
                {donutSegments.map(segment => {
                  const isHovered = hoveredCategory === segment.category.id;
                  const isDimmed = Boolean(hoveredCategory && !isHovered);

                  return (
                    <circle
                      key={segment.category.id}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={isHovered ? 12 : 10}
                      strokeLinecap="round"
                      strokeDasharray={segment.strokeDasharray}
                      strokeDashoffset={segment.strokeDashoffset}
                      className={`transition-all duration-300 cursor-pointer ${
                        isDimmed ? 'opacity-35' : 'opacity-100'
                      }`}
                      onMouseEnter={() => setHoveredCategory(segment.category.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => handleCategoryClick(segment.category.id)}
                    />
                  );
                })}
              </svg>

              {/* Centro Responsivo do Anel */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500 truncate max-w-[130px]">
                  {activeHoveredItem ? activeHoveredItem.category.name : 'TOTAL GASTO'}
                </span>
                
                <span className="text-lg sm:text-xl md:text-2xl font-black font-mono-num text-slate-900 dark:text-white tracking-tight truncate max-w-[140px] px-1">
                  {hideValues 
                    ? '••••••' 
                    : activeHoveredItem 
                      ? formatCurrency(activeHoveredItem.total) 
                      : formatCurrency(totalExpense)}
                </span>

                <span className={`text-[11px] font-bold mt-0.5 truncate max-w-[130px] ${
                  activeHoveredItem 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-slate-500 dark:text-zinc-400'
                }`}>
                  {activeHoveredItem 
                    ? `${activeHoveredItem.percentage.toFixed(1)}% das despesas` 
                    : '100% das saídas'}
                </span>
              </div>
            </div>

            {/* Legenda com as 5 Maiores + "Outras (N)" com Barra Fina */}
            <div className="w-full flex-1 space-y-2">
              {displayCategories.map(item => {
                const isHovered = hoveredCategory === item.category.id;
                const isOther = item.category.id === '__other__';
                const subItems = (item as any).subItems as CategorySpending[] | undefined;

                if (isOther) {
                  return (
                    <div 
                      key="__other__" 
                      className="border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden transition-all bg-slate-50/50 dark:bg-white/[0.02]"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={isOtherExpanded}
                        aria-label={`Outras categorias agrupadas: ${formatCurrency(item.total)}, ${item.percentage.toFixed(1)}% do total`}
                        onClick={() => setIsOtherExpanded(prev => !prev)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setIsOtherExpanded(prev => !prev);
                          }
                        }}
                        onMouseEnter={() => setHoveredCategory(item.category.id)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className={`p-2.5 sm:p-3 flex items-center justify-between cursor-pointer transition-colors min-h-[44px] ${
                          isHovered ? 'bg-slate-100/80 dark:bg-white/[0.06]' : 'hover:bg-slate-100/50 dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: item.category.color }} 
                          />
                          <span className="text-slate-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold truncate">
                            {item.category.name}
                          </span>
                          <span className="text-[10px] text-slate-400 transition-transform">
                            {isOtherExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 font-mono-num text-xs sm:text-sm">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {hideValues ? '••••••' : formatCurrency(item.total)}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 w-11 text-right">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Subitens expandidos de Outras */}
                      {isOtherExpanded && subItems && (
                        <div className="px-4 pb-3 pt-1 space-y-2 border-t border-slate-200/60 dark:border-white/5 text-xs animate-in fade-in duration-200">
                          {subItems.map(sub => (
                            <div
                              key={sub.category.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleCategoryClick(sub.category.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleCategoryClick(sub.category.id);
                                }
                              }}
                              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title={`Filtrar extrato por ${sub.category.name}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span 
                                  className="w-2 h-2 rounded-full shrink-0" 
                                  style={{ backgroundColor: sub.category.color }} 
                                />
                                <span className="text-slate-600 dark:text-zinc-300 truncate">
                                  {sub.category.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 font-mono-num">
                                <span className="text-slate-900 dark:text-white font-semibold">
                                  {hideValues ? '••••••' : formatCurrency(sub.total)}
                                </span>
                                <span className="text-slate-400 text-[10px]">
                                  ({sub.percentage.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Linha de Categoria Normal (Top 5)
                return (
                  <div
                    key={item.category.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.category.name}: ${formatCurrency(item.total)}, ${item.percentage.toFixed(1)}% do total`}
                    onMouseEnter={() => setHoveredCategory(item.category.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => handleCategoryClick(item.category.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCategoryClick(item.category.id);
                      }
                    }}
                    className={`group p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer min-h-[44px] flex flex-col justify-center border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isHovered 
                        ? 'bg-slate-100/80 dark:bg-white/[0.08] border-slate-200/80 dark:border-white/15 shadow-xs' 
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: item.category.color }} 
                        />
                        <span className="text-slate-800 dark:text-zinc-200 truncate font-medium">
                          {item.category.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 font-mono-num">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {hideValues ? '••••••' : formatCurrency(item.total)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 w-11 text-right">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Barra Fina Proporcional à Fatia */}
                    <div className="w-full bg-slate-100 dark:bg-white/5 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${Math.min(100, Math.max(3, item.percentage))}%`, 
                          backgroundColor: item.category.color 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Toggle para Tetos Detalhados por Categoria */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDetailedCards(!showDetailedCards)}
              className="text-xs text-slate-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors py-1"
            >
              <span>{showDetailedCards ? 'Ocultar tetos detalhados' : 'Ver progresso de tetos por categoria'}</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showDetailedCards ? 'rotate-90' : ''}`} />
            </button>

            {showDetailedCards && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                {activeExpenseSpending.map(item => {
                  const hasBudget = Boolean(item.budgetLimit && item.budgetLimit > 0);
                  const isOverBudget = Boolean(hasBudget && item.budgetPercentage && item.budgetPercentage > 100);
                  const isHovered = hoveredCategory === item.category.id;

                  return (
                    <div 
                      key={item.category.id}
                      onMouseEnter={() => setHoveredCategory(item.category.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => handleCategoryClick(item.category.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
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
                            {hideValues ? '••••••' : formatCurrency(item.total)}
                          </div>
                          {hasBudget ? (
                            <div className={`text-[10px] font-semibold ${isOverBudget ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                              {item.budgetPercentage?.toFixed(0)}% do teto
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                              {item.percentage.toFixed(1)}% do total
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Barra de progresso com cor da categoria (e vermelho se estourar) */}
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
                            Definir teto
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rodapé do Teto com 3 Estados Claros (Texto + Ícone + Cor) */}
          <div className="pt-5 border-t border-slate-200/60 dark:border-white/[0.08] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-zinc-400">Teto do mês:</span>
                <strong className="text-sm font-mono-num text-slate-900 dark:text-white">
                  {totalBudgetLimit > 0 ? (hideValues ? '••••••' : formatCurrency(totalBudgetLimit)) : 'Não definido'}
                </strong>
              </div>

              {/* Status do Teto com Ícone e Texto Claro */}
              {totalBudgetLimit > 0 ? (
                isBudgetExceeded ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{hideValues ? '••••••' : formatCurrency(totalExpense - totalBudgetLimit)} acima do teto (+{(percentageUsed - 100).toFixed(0)}%)</span>
                  </div>
                ) : isWarningBudget ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Atenção: {percentageUsed.toFixed(0)}% do teto atingido ({hideValues ? '••••••' : formatCurrency(remainingBudget)} livres)</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                    <span>{hideValues ? '••••••' : formatCurrency(remainingBudget)} ainda livres ({percentageUsed.toFixed(0)}% utilizado)</span>
                  </div>
                )
              ) : (
                <span className="text-slate-400 dark:text-zinc-500 italic">
                  Defina um teto para acompanhar seus gastos
                </span>
              )}
            </div>

            {/* Barra Fina de Progresso do Teto */}
            {totalBudgetLimit > 0 && (
              <div className="w-full bg-slate-200/70 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isBudgetExceeded 
                      ? 'bg-rose-500' 
                      : isWarningBudget 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                  }`} 
                  style={{ width: `${Math.min(100, percentageUsed)}%` }} 
                />
              </div>
            )}

            {/* Links Rápidos do Rodapé */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button 
                type="button"
                onClick={() => setShowDetailedCards(prev => !prev)}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                {showDetailedCards ? 'Ocultar detalhes de tetos' : 'Ver progresso de tetos por categoria →'}
              </button>
              <button 
                type="button"
                onClick={onOpenBudgets}
                className="text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white font-medium cursor-pointer"
              >
                Gerenciar tetos
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ABA 2: Evolução Diária (Curva Suave Bézier + Modo Barras) */}
      {activeTab === 'daily' && (
        <div className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>Ritmo e picos de despesas ao longo do mês</span>
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-black/50 p-0.5 border border-slate-200 dark:border-white/10">
                <button
                  type="button"
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
                  type="button"
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
                Dia {hoveredDay.day}: {hideValues ? '••••••' : formatCurrency(hoveredDay.amount)} ({hoveredDay.count} compras)
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Toque ou passe o cursor sobre os pontos</span>
            )}
          </div>

          {/* Curva Suave Bézier */}
          {chartSubView === 'area' ? (
            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-black/40 border border-slate-100 dark:border-white/10 relative overflow-hidden">
              <div className="h-44 w-full relative">
                <svg 
                  className="w-full h-full overflow-visible" 
                  viewBox={`0 0 ${areaChartData.width} ${areaChartData.height}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="bezierAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="70%" stopColor="#10b981" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="35" x2={areaChartData.width} y2="35" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-zinc-800/80" strokeWidth="1" />
                  <line x1="0" y1="75" x2={areaChartData.width} y2="75" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-zinc-800/80" strokeWidth="1" />
                  <line x1="0" y1="115" x2={areaChartData.width} y2="115" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-zinc-800/80" strokeWidth="1" />

                  {areaChartData.areaD && (
                    <path d={areaChartData.areaD} fill="url(#bezierAreaGrad)" />
                  )}

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

                {hoveredDay && hoveredDay.amount > 0 && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900 dark:bg-[#121214] text-white text-[11px] px-3 py-1 rounded-lg font-mono-num shadow-lg border border-slate-700 dark:border-white/15 flex items-center gap-1.5 z-20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Dia {hoveredDay.day}: {hideValues ? '••••••' : formatCurrency(hoveredDay.amount)}
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
            /* Modo Barras */
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
                      {d.amount > 0 && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900 dark:bg-[#121214] text-white text-[10px] py-0.5 px-1.5 rounded-md font-mono-num whitespace-nowrap shadow-md border border-transparent dark:border-white/15">
                          {hideValues ? '••••••' : formatCurrency(d.amount)}
                        </div>
                      )}

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

      {/* ABA 3: Formas de Pagamento */}
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
                {hideValues ? '••••••' : formatCurrency(pm.amount)}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
