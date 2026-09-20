export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 
  | 'credit_card' 
  | 'debit_card' 
  | 'pix' 
  | 'cash' 
  | 'boleto' 
  | 'transfer';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string; // Tailwind color class or hex
  bgLight: string;
  textColor: string;
  type: TransactionType | 'both';
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  status: 'paid' | 'pending';
  isRecurring?: boolean;
  notes?: string;
  createdAt: number;
}

export interface CategoryBudget {
  categoryId: string;
  limit: number;
}

export interface MonthPeriod {
  year: number;
  month: number; // 0 for Jan, 11 for Dec
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  paidExpense: number;
  pendingExpense: number;
  savingsRate: number;
  totalBudgetLimit: number;
  budgetPercentageUsed: number;
}

export interface CategorySpending {
  category: Category;
  total: number;
  percentage: number;
  transactionCount: number;
  budgetLimit?: number;
  budgetPercentage?: number;
}

export interface FilterOptions {
  search: string;
  type: 'all' | 'expense' | 'income';
  categoryId: string;
  status: 'all' | 'paid' | 'pending';
  sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}
