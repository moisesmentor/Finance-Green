import { 
  Transaction, 
  CategoryBudget, 
  FinancialSummary, 
  CategorySpending, 
  FinancialGoal, 
  AnnualSummary, 
  AnnualMonthSummary,
  CloudConfig
} from '../types';
import { CATEGORIES, DEFAULT_BUDGETS, getSampleTransactions, PAYMENT_METHODS } from './constants';

const STORAGE_KEYS = {
  TRANSACTIONS: 'financas_mensais_transactions_v1',
  BUDGETS: 'financas_mensais_budgets_v1',
  GOALS: 'financas_mensais_goals_v1',
  CLOUD_CONFIG: 'financas_mensais_cloud_v1',
};

export const DEFAULT_GOALS: FinancialGoal[] = [
  {
    id: 'goal-1',
    title: 'Reserva de Emergência',
    targetAmount: 15000,
    currentAmount: 5000,
    deadline: '2027-12-31',
    categoryIcon: 'Wallet',
    color: '#059669',
    createdAt: Date.now() - 30 * 24 * 3600 * 1000,
    history: [
      {
        id: 'contrib-1',
        amount: 3500,
        date: '2026-08-10',
        type: 'deposit',
        note: 'Aporte inicial da reserva',
        createdAt: Date.now() - 30 * 24 * 3600 * 1000,
      },
      {
        id: 'contrib-2',
        amount: 1500,
        date: '2026-09-05',
        type: 'deposit',
        note: 'Economia do mês',
        createdAt: Date.now() - 15 * 24 * 3600 * 1000,
      },
    ],
  },
  {
    id: 'goal-2',
    title: 'Viagem de Férias',
    targetAmount: 6000,
    currentAmount: 2400,
    deadline: '2027-07-15',
    categoryIcon: 'Sparkles',
    color: '#2563eb',
    createdAt: Date.now() - 20 * 24 * 3600 * 1000,
    history: [
      {
        id: 'contrib-3',
        amount: 2400,
        date: '2026-09-12',
        type: 'deposit',
        note: 'Passagens e reserva',
        createdAt: Date.now() - 8 * 24 * 3600 * 1000,
      },
    ],
  },
];


export function loadStoredTransactions(): Transaction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) {
      const samples = getSampleTransactions();
      saveStoredTransactions(samples);
      return samples;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erro ao carregar transações do localStorage:', err);
    return getSampleTransactions();
  }
}

export function saveStoredTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Erro ao salvar transações no localStorage:', err);
  }
}

export function loadStoredBudgets(): CategoryBudget[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    if (!data) {
      saveStoredBudgets(DEFAULT_BUDGETS);
      return DEFAULT_BUDGETS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : DEFAULT_BUDGETS;
  } catch (err) {
    console.error('Erro ao carregar orçamentos:', err);
    return DEFAULT_BUDGETS;
  }
}

export function saveStoredBudgets(budgets: CategoryBudget[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  } catch (err) {
    console.error('Erro ao salvar orçamentos:', err);
  }
}

export function loadStoredGoals(): FinancialGoal[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (!data) {
      saveStoredGoals(DEFAULT_GOALS);
      return DEFAULT_GOALS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : DEFAULT_GOALS;
  } catch (err) {
    console.error('Erro ao carregar metas:', err);
    return DEFAULT_GOALS;
  }
}

export function saveStoredGoals(goals: FinancialGoal[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  } catch (err) {
    console.error('Erro ao salvar metas:', err);
  }
}

export function loadStoredCloudConfig(): CloudConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CLOUD_CONFIG);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    // Ignore
  }
  return { enabled: false, provider: 'supabase' };
}

export function saveStoredCloudConfig(config: CloudConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLOUD_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Erro ao salvar configuração da nuvem:', err);
  }
}

/**
 * Increment a YYYY-MM-DD date by monthCount months safely handling short months
 */
export function addMonthsToDateString(dateStr: string, monthOffset: number): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-11
  const day = parseInt(parts[2], 10);

  const targetDate = new Date(year, month + monthOffset, 1);
  const daysInTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const validDay = Math.min(day, daysInTargetMonth);

  const finalYear = targetDate.getFullYear();
  const finalMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
  const finalDay = String(validDay).padStart(2, '0');

  return `${finalYear}-${finalMonth}-${finalDay}`;
}

/**
 * Creates installment transactions
 */
export function generateInstallmentTransactions(
  baseData: Omit<Transaction, 'id' | 'createdAt'>,
  installmentsCount: number
): Transaction[] {
  const groupId = `inst-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
  const totalAmount = baseData.amount;
  const singleInstallmentAmount = Math.round((totalAmount / installmentsCount) * 100) / 100;
  // Ensure the sum equals totalAmount by adjusting on the last installment
  const remainder = Math.round((totalAmount - singleInstallmentAmount * installmentsCount) * 100) / 100;

  const transactions: Transaction[] = [];

  for (let i = 0; i < installmentsCount; i++) {
    const isFirst = i === 0;
    const isLast = i === installmentsCount - 1;
    const currentAmount = isLast ? Math.round((singleInstallmentAmount + remainder) * 100) / 100 : singleInstallmentAmount;
    const date = addMonthsToDateString(baseData.date, i);

    transactions.push({
      ...baseData,
      id: `tx-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
      description: `${baseData.description} (${i + 1}/${installmentsCount})`,
      amount: currentAmount,
      date,
      status: isFirst ? baseData.status : 'pending',
      installmentGroupId: groupId,
      installmentCurrent: i + 1,
      installmentTotal: installmentsCount,
      createdAt: Date.now() + i,
    });
  }

  return transactions;
}

/**
 * Creates recurring projection transactions for the following N months
 */
export function generateRecurringTransactions(
  baseData: Omit<Transaction, 'id' | 'createdAt'>,
  monthsCount: number = 6
): Transaction[] {
  const groupId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
  const transactions: Transaction[] = [];

  for (let i = 0; i < monthsCount; i++) {
    const isFirst = i === 0;
    const date = addMonthsToDateString(baseData.date, i);

    transactions.push({
      ...baseData,
      id: `tx-rec-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
      date,
      status: isFirst ? baseData.status : 'pending',
      isRecurring: true,
      recurringFrequency: 'monthly',
      installmentGroupId: groupId,
      createdAt: Date.now() + i,
    });
  }

  return transactions;
}

export function calculateSummary(transactions: Transaction[], budgets: CategoryBudget[]): FinancialSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let paidExpense = 0;
  let pendingExpense = 0;

  for (const t of transactions) {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else if (t.type === 'expense') {
      totalExpense += t.amount;
      if (t.status === 'paid') {
        paidExpense += t.amount;
      } else {
        pendingExpense += t.amount;
      }
    }
  }

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0;
  
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.limit, 0);
  const budgetPercentageUsed = totalBudgetLimit > 0 ? (totalExpense / totalBudgetLimit) * 100 : 0;

  return {
    totalIncome,
    totalExpense,
    netBalance,
    paidExpense,
    pendingExpense,
    savingsRate,
    totalBudgetLimit,
    budgetPercentageUsed,
  };
}

export function calculateCategorySpending(
  transactions: Transaction[], 
  budgets: CategoryBudget[], 
  type: 'expense' | 'income' = 'expense'
): CategorySpending[] {
  const filtered = transactions.filter(t => t.type === type);
  const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);

  const budgetMap = new Map<string, number>();
  for (const b of budgets) {
    budgetMap.set(b.categoryId, b.limit);
  }

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const t of filtered) {
    const current = categoryMap.get(t.categoryId) || { total: 0, count: 0 };
    categoryMap.set(t.categoryId, {
      total: current.total + t.amount,
      count: current.count + 1,
    });
  }

  const result: CategorySpending[] = [];

  for (const cat of CATEGORIES) {
    if (cat.type !== type && cat.type !== 'both') continue;

    const data = categoryMap.get(cat.id);
    const limit = budgetMap.get(cat.id);

    if (data || (type === 'expense' && limit && limit > 0)) {
      const total = data ? data.total : 0;
      const count = data ? data.count : 0;
      const percentage = totalAmount > 0 ? (total / totalAmount) * 100 : 0;
      const budgetPercentage = limit && limit > 0 ? (total / limit) * 100 : undefined;

      result.push({
        category: cat,
        total,
        percentage,
        transactionCount: count,
        budgetLimit: limit,
        budgetPercentage,
      });
    }
  }

  return result.sort((a, b) => b.total - a.total);
}

export function calculateAnnualSummary(transactions: Transaction[], targetYear: number): AnnualSummary {
  const months: AnnualMonthSummary[] = [];
  let totalIncome = 0;
  let totalExpense = 0;

  for (let m = 0; m < 12; m++) {
    const monthStr = String(m + 1).padStart(2, '0');
    const prefix = `${targetYear}-${monthStr}`;

    const monthTxs = transactions.filter(t => t.date && t.date.startsWith(prefix));
    let mIncome = 0;
    let mExpense = 0;

    for (const t of monthTxs) {
      if (t.type === 'income') mIncome += t.amount;
      else if (t.type === 'expense') mExpense += t.amount;
    }

    const net = mIncome - mExpense;
    const savingsRate = mIncome > 0 ? Math.max(0, ((mIncome - mExpense) / mIncome) * 100) : 0;

    months.push({
      month: m,
      year: targetYear,
      income: mIncome,
      expense: mExpense,
      net,
      savingsRate,
      transactionCount: monthTxs.length,
    });

    totalIncome += mIncome;
    totalExpense += mExpense;
  }

  const netBalance = totalIncome - totalExpense;
  const avgMonthlyIncome = totalIncome / 12;
  const avgMonthlyExpense = totalExpense / 12;
  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  return {
    year: targetYear,
    totalIncome,
    totalExpense,
    netBalance,
    avgMonthlyIncome,
    avgMonthlyExpense,
    savingsRate,
    months,
  };
}

/**
 * Exports transactions to CSV with UTF-8 BOM so Excel opens with proper accents and columns
 */
export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const catMap = new Map(CATEGORIES.map(c => [c.id, c.name]));
  const pmMap = new Map(PAYMENT_METHODS.map(p => [p.id, p.label]));

  const headers = [
    'Data',
    'Tipo',
    'Descrição',
    'Categoria',
    'Valor (R$)',
    'Forma de Pagamento',
    'Status',
    'Parcela',
    'Recorrente',
    'Observações',
  ];

  const rows = transactions.map(t => {
    const typeLabel = t.type === 'income' ? 'Receita' : 'Despesa';
    const statusLabel = t.status === 'paid' ? 'Pago/Recebido' : 'Pendente';
    const catLabel = catMap.get(t.categoryId) || t.categoryId;
    const pmLabel = pmMap.get(t.paymentMethod) || t.paymentMethod;
    const installmentStr = t.installmentTotal ? `${t.installmentCurrent}/${t.installmentTotal}` : '-';
    const recurringStr = t.isRecurring ? 'Sim' : 'Não';
    const safeDesc = `"${(t.description || '').replace(/"/g, '""')}"`;
    const safeNotes = `"${(t.notes || '').replace(/"/g, '""')}"`;
    const formattedAmount = t.amount.toFixed(2).replace('.', ',');

    return [
      t.date,
      typeLabel,
      safeDesc,
      catLabel,
      formattedAmount,
      pmLabel,
      statusLabel,
      installmentStr,
      recurringStr,
      safeNotes,
    ].join(';');
  });

  // \uFEFF is the UTF-8 Byte Order Mark (BOM)
  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}
