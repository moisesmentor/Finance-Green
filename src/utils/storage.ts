import { Transaction, CategoryBudget, FinancialSummary, CategorySpending } from '../types';
import { CATEGORIES, DEFAULT_BUDGETS, getSampleTransactions } from './constants';

const STORAGE_KEYS = {
  TRANSACTIONS: 'financas_mensais_transactions_v1',
  BUDGETS: 'financas_mensais_budgets_v1',
};

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

  // Ordenar por maior gasto primeiro
  return result.sort((a, b) => b.total - a.total);
}
