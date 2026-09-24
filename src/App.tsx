/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Transaction, 
  CategoryBudget, 
  MonthPeriod, 
  FinancialGoal, 
  CloudConfig,
  FirebaseSyncSettings,
  FirebaseSyncStatus,
  UserProfile
} from './types';
import { 
  loadStoredTransactions, 
  saveStoredTransactions, 
  loadStoredBudgets, 
  saveStoredBudgets, 
  loadStoredGoals,
  saveStoredGoals,
  loadStoredCloudConfig,
  saveStoredCloudConfig,
  calculateSummary,
  generateInstallmentTransactions,
  generateRecurringTransactions
} from './utils/storage';
import { 
  loadStoredFirebaseSettings, 
  saveStoredFirebaseSettings, 
  onAuthChange,
  logoutUser,
  subscribeToUserWorkspaceRealtime, 
  pushUserWorkspaceData, 
  migrateLegacyDataToUser 
} from './utils/firebase';
import { getSampleTransactions, DEFAULT_BUDGETS } from './utils/constants';
import { useTheme } from './utils/useTheme';
import { Wallet } from 'lucide-react';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { MonthlyCharts } from './components/MonthlyCharts';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { BudgetModal } from './components/BudgetModal';
import { ExportImportModal } from './components/ExportImportModal';
import { GoalsModal } from './components/GoalsModal';
import { AnnualReportModal } from './components/AnnualReportModal';
import { CloudConfigModal } from './components/CloudConfigModal';
import { FirebaseSyncModal } from './components/FirebaseSyncModal';
import { AuthScreen } from './components/AuthScreen';

export default function App() {
  const { theme, toggleTheme } = useTheme();

  // Authentication State (Firebase Auth)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>(() => loadStoredTransactions());
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => loadStoredBudgets());
  const [goals, setGoals] = useState<FinancialGoal[]>(() => loadStoredGoals());
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(() => loadStoredCloudConfig());
  
  // Firebase Realtime State
  const [firebaseSettings, setFirebaseSettings] = useState<FirebaseSyncSettings>(() => loadStoredFirebaseSettings());
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseSyncStatus>('unconfigured');
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);

  // Current active month period
  const [period, setPeriod] = useState<MonthPeriod>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [isAnnualReportModalOpen, setIsAnnualReportModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);

  // Synchronize state changes to localStorage
  useEffect(() => {
    saveStoredTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveStoredBudgets(budgets);
  }, [budgets]);

  useEffect(() => {
    saveStoredGoals(goals);
  }, [goals]);

  useEffect(() => {
    saveStoredCloudConfig(cloudConfig);
  }, [cloudConfig]);

  // Monitorar estado de autenticação (Sessão persistente do Firebase Auth)
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Limpeza de segurança: remover qualquer parâmetro ?sync= da URL
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('sync')) {
        url.searchParams.delete('sync');
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
      }
    }
  }, []);

  // Sincronização em tempo real isolada por usuário autenticado (users/{uid})
  useEffect(() => {
    if (!currentUser?.uid) {
      setFirebaseStatus('unconfigured');
      return;
    }

    setFirebaseStatus('syncing');

    // 1. Migração automática: se for o primeiro login e a nuvem estiver vazia, migra dados locais
    migrateLegacyDataToUser(currentUser.uid, {
      transactions,
      budgets,
      goals,
    }).catch((err) => console.warn('Aviso durante migração inicial:', err));

    // 2. Escuta contínua de alterações do usuário autenticado no Firestore
    const unsubscribe = subscribeToUserWorkspaceRealtime(
      currentUser.uid,
      (remoteData, shouldApply) => {
        setFirebaseStatus('connected');
        if (shouldApply) {
          if (Array.isArray(remoteData.transactions)) {
            setTransactions(remoteData.transactions);
          }
          if (Array.isArray(remoteData.budgets) && remoteData.budgets.length > 0) {
            setBudgets(remoteData.budgets);
          }
          if (Array.isArray(remoteData.goals) && remoteData.goals.length > 0) {
            setGoals(remoteData.goals);
          }
        }
      },
      (error) => {
        console.warn('Erro na conexão com Firebase:', error);
        setFirebaseStatus('error');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid]);

  // Enviar alterações em segundo plano para a nuvem sob a conta do usuário
  const syncToCloudInBackground = (partialData: {
    transactions?: Transaction[];
    budgets?: CategoryBudget[];
    goals?: FinancialGoal[];
  }) => {
    if (!currentUser?.uid) return;

    setFirebaseStatus('syncing');
    pushUserWorkspaceData(currentUser.uid, partialData)
      .then((res) => {
        if (res.success) {
          setFirebaseStatus('connected');
        } else {
          console.warn('Erro no salvamento remoto:', res.error);
          setFirebaseStatus('error');
        }
      })
      .catch((err) => {
        console.warn('Exceção ao sincronizar:', err);
        setFirebaseStatus('error');
      });
  };

  // Logout do usuário autenticado
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Erro ao sair da conta:', err);
    }
  };

  // Transactions filtered for the active month
  const monthTransactions = useMemo(() => {
    const targetMonthStr = String(period.month + 1).padStart(2, '0');
    const targetPrefix = `${period.year}-${targetMonthStr}`;

    return transactions.filter(t => {
      if (!t.date) return false;
      return t.date.startsWith(targetPrefix);
    });
  }, [transactions, period]);

  // Financial summary for the current month
  const summary = useMemo(() => {
    return calculateSummary(monthTransactions, budgets);
  }, [monthTransactions, budgets]);

  // Handlers for transactions
  const handleSaveTransaction = (
    data: Omit<Transaction, 'id' | 'createdAt'>,
    id?: string,
    installmentsCount?: number,
    recurringMonths?: number
  ) => {
    let nextTransactions: Transaction[] = [];

    if (id) {
      // Edit existing
      nextTransactions = transactions.map(t => (t.id === id ? { ...t, ...data } : t));
    } else if (installmentsCount && installmentsCount > 1) {
      // Create batch of installments
      const installmentTxs = generateInstallmentTransactions(data, installmentsCount);
      nextTransactions = [...installmentTxs, ...transactions];
    } else if (recurringMonths && recurringMonths > 1) {
      // Create recurring projections
      const recurringTxs = generateRecurringTransactions(data, recurringMonths);
      nextTransactions = [...recurringTxs, ...transactions];
    } else {
      // Single new
      const newTx: Transaction = {
        ...data,
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
      };
      nextTransactions = [newTx, ...transactions];
    }

    setTransactions(nextTransactions);
    syncToCloudInBackground({ transactions: nextTransactions });
  };

  const handleDeleteTransaction = (id: string) => {
    const nextTransactions = transactions.filter(t => t.id !== id);
    setTransactions(nextTransactions);
    syncToCloudInBackground({ transactions: nextTransactions });
  };

  const handleDeleteInstallmentGroup = (groupId: string) => {
    const nextTransactions = transactions.filter(t => t.installmentGroupId !== groupId);
    setTransactions(nextTransactions);
    syncToCloudInBackground({ transactions: nextTransactions });
  };

  const handleToggleStatus = (id: string) => {
    const nextTransactions = transactions.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'paid' ? 'pending' : 'paid';
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setTransactions(nextTransactions);
    syncToCloudInBackground({ transactions: nextTransactions });
  };

  const handleOpenNewTransaction = () => {
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };

  // Handlers for Budgets
  const handleSaveBudgets = (newBudgets: CategoryBudget[]) => {
    setBudgets(newBudgets);
    syncToCloudInBackground({ budgets: newBudgets });
  };

  // Handlers for Goals
  const handleSaveGoals = (newGoals: FinancialGoal[]) => {
    setGoals(newGoals);
    syncToCloudInBackground({ goals: newGoals });
  };

  // Handlers for Backup & Reset
  const handleImportData = (
    newTransactions: Transaction[], 
    newBudgets: CategoryBudget[],
    newGoals?: FinancialGoal[]
  ) => {
    setTransactions(newTransactions);
    if (newBudgets && newBudgets.length > 0) {
      setBudgets(newBudgets);
    }
    if (newGoals && newGoals.length > 0) {
      setGoals(newGoals);
    }
    syncToCloudInBackground({
      transactions: newTransactions,
      budgets: newBudgets && newBudgets.length > 0 ? newBudgets : undefined,
      goals: newGoals && newGoals.length > 0 ? newGoals : undefined,
    });
  };

  const handleResetToSample = () => {
    const samples = getSampleTransactions();
    setTransactions(samples);
    setBudgets(DEFAULT_BUDGETS);
    const now = new Date();
    setPeriod({ year: now.getFullYear(), month: now.getMonth() });
    syncToCloudInBackground({ transactions: samples, budgets: DEFAULT_BUDGETS });
  };

  const handleClearAll = () => {
    setTransactions([]);
    syncToCloudInBackground({ transactions: [] });
  };

  // Cloud sync apply
  const handleApplyCloudData = (
    cloudTxs: Transaction[],
    cloudBudgets: CategoryBudget[],
    cloudGoals: FinancialGoal[]
  ) => {
    setTransactions(cloudTxs);
    setBudgets(cloudBudgets);
    setGoals(cloudGoals);
  };

  // Carregamento de Inicialização da Sessão
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-500/20 animate-pulse">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2.5 text-slate-400 text-sm font-medium">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Carregando ambiente seguro...</span>
          </div>
        </div>
      </div>
    );
  }

  // Proteção Total de Rotas: se não autenticado, exibe unicamente a tela de autenticação
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-emerald-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/20 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-100 selection:text-emerald-900 transition-colors">
      
      {/* Top Header */}
      <Header
        period={period}
        onPeriodChange={setPeriod}
        onOpenNewTransaction={handleOpenNewTransaction}
        onOpenBudgets={() => setIsBudgetModalOpen(true)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenGoals={() => setIsGoalsModalOpen(true)}
        onOpenAnnualReport={() => setIsAnnualReportModalOpen(true)}
        onOpenCloud={() => setIsCloudModalOpen(true)}
        onOpenFirebaseSync={() => setIsFirebaseModalOpen(true)}
        firebaseStatus={firebaseStatus}
        syncKey={currentUser.uid}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Key Metrics Cards */}
        <SummaryCards
          summary={summary}
          onOpenBudgets={() => setIsBudgetModalOpen(true)}
        />

        {/* Visual Charts & Category Spending Insights */}
        <MonthlyCharts
          transactions={monthTransactions}
          budgets={budgets}
          period={period}
          onOpenBudgets={() => setIsBudgetModalOpen(true)}
        />

        {/* Extrato & Transaction List */}
        <TransactionList
          transactions={monthTransactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          onDeleteGroup={handleDeleteInstallmentGroup}
          onToggleStatus={handleToggleStatus}
          onAddNew={handleOpenNewTransaction}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 transition-colors no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Finanças Mensais • Seus dados estão salvos com segurança no seu navegador</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsGoalsModalOpen(true)}
              className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium cursor-pointer"
            >
              Cofrinhos & Metas
            </button>
            <span>•</span>
            <button
              onClick={() => setIsAnnualReportModalOpen(true)}
              className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium cursor-pointer"
            >
              Visão Anual
            </button>
            <span>•</span>
            <button
              onClick={() => setIsCloudModalOpen(true)}
              className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium cursor-pointer"
            >
              Sincronização Nuvem
            </button>
            <span>•</span>
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium cursor-pointer"
            >
              Backup JSON
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        initialData={editingTransaction}
        currentPeriod={period}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentBudgets={budgets}
        onSaveBudgets={handleSaveBudgets}
        transactionsThisMonth={monthTransactions}
      />

      <GoalsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        goals={goals}
        onSaveGoals={handleSaveGoals}
      />

      <AnnualReportModal
        isOpen={isAnnualReportModalOpen}
        onClose={() => setIsAnnualReportModalOpen(false)}
        transactions={transactions}
        currentYear={period.year}
      />

      <CloudConfigModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        cloudConfig={cloudConfig}
        onSaveCloudConfig={setCloudConfig}
        transactions={transactions}
        budgets={budgets}
        goals={goals}
        onApplyCloudData={handleApplyCloudData}
      />

      <FirebaseSyncModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        settings={firebaseSettings}
        onSaveSettings={(newSettings) => setFirebaseSettings(newSettings)}
        syncStatus={firebaseStatus}
        localTransactions={transactions}
        localBudgets={budgets}
        localGoals={goals}
        onApplyCloudData={(cloudTxs, cloudBudgets, cloudGoals) => {
          setTransactions(cloudTxs);
          setBudgets(cloudBudgets);
          setGoals(cloudGoals);
        }}
      />

      <ExportImportModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        transactions={transactions}
        budgets={budgets}
        goals={goals}
        onImportData={handleImportData}
        onResetToSample={handleResetToSample}
        onClearAll={handleClearAll}
      />

    </div>
  );
}
