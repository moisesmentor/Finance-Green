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
  recurringFrequency?: 'monthly' | 'yearly';
  installmentGroupId?: string;
  installmentCurrent?: number;
  installmentTotal?: number;
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

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  type: 'deposit' | 'withdraw';
  note?: string;
  createdAt: number;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // YYYY-MM-DD
  categoryIcon: string;
  color: string;
  createdAt: number;
  history?: GoalContribution[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AnnualMonthSummary {
  month: number;
  year: number;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  transactionCount: number;
}

export interface AnnualSummary {
  year: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  savingsRate: number;
  months: AnnualMonthSummary[];
}

export interface CloudConfig {
  enabled: boolean;
  provider: 'supabase';
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  lastSyncedAt?: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export type FirebaseSyncStatus = 'connected' | 'syncing' | 'offline' | 'unconfigured' | 'error';

export interface FirebaseSyncSettings {
  enabled: boolean;
  syncKey: string;
  config: FirebaseConfig | null;
  lastSyncedAt?: string;
}

export interface WorkspaceRemoteData {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  goals: FinancialGoal[];
  updatedAt: number;
  updatedByDeviceId?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}



