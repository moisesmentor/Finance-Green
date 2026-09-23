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
  FirebaseSyncStatus 
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
  subscribeToWorkspaceRealtime, 
  pushWorkspaceData, 
  checkUrlForSyncKey 
} from './utils/firebase';
import { getSampleTransactions, DEFAULT_BUDGETS } from './utils/constants';
import { useTheme } from './utils/useTheme';
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

export default function App() {
  const { theme, toggleTheme } = useTheme();

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

  // Salvar configurações do Firebase localmente
  useEffect(() => {
    saveStoredFirebaseSettings(firebaseSettings);
  }, [firebaseSettings]);

  // Detectar emparelhamento automático via link/QR Code (?sync=CHAVE)
  useEffect(() => {
    const urlSyncKey = checkUrlForSyncKey();
    if (urlSyncKey) {
      setFirebaseSettings(prev => {
        const next = {
          ...prev,
          syncKey: urlSyncKey,
          enabled: true,
        };
        saveStoredFirebaseSettings(next);
        return next;
      });
    }
  }, []);

  // Iniciar ou reconectar escuta em tempo real do Firebase Firestore
  useEffect(() => {
    const config = firebaseSettings.config || DEFAULT_FIREBASE_CONFIG;
    const syncKey = firebaseSettings.syncKey || 'FIN-MOISES';

    setFirebaseStatus('syncing');

    const unsubscribe = subscribeToWorkspaceRealtime(
      config,
      syncKey,
      (remoteData, shouldApply) => {
        setFirebaseStatus('connected');
        if (shouldApply) {
          // Atualização da nuvem recebida
          if (Array.isArray(remoteData.transactions) && remoteData.transactions.length > 0) {
            setTransactions(remoteData.transactions);
            if (Array.isArray(remoteData.budgets) && remoteData.budgets.length > 0) {
              setBudgets(remoteData.budgets);
            }
            if (Array.isArray(remoteData.goals) && remoteData.goals.length > 0) {
              setGoals(remoteData.goals);
            }
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
  }, [firebaseSettings.syncKey]);

  // Enviar alterações em segundo plano para a nuvem
  const syncToCloudInBackground = (partialData: {
    transactions?: Transaction[];
    budgets?: CategoryBudget[];
    goals?: FinancialGoal[];
  }) => {
    const config = firebaseSettings.config || DEFAULT_FIREBASE_CONFIG;
    const syncKey = firebaseSettings.syncKey || 'FIN-MOISES';

    setFirebaseStatus('syncing');
    pushWorkspaceData(config, syncKey, partialData)
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
        syncKey={firebaseSettings.syncKey}
        theme={theme}
        onToggleTheme={toggleTheme}
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
