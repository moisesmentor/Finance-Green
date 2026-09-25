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
  InvestmentAsset,
  Category,
  CloudConfig,
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
  DEFAULT_INVESTMENTS,
  loadStoredInvestments,
  saveStoredInvestments,
  loadStoredCustomCategories,
  saveStoredCustomCategories,
  loadStoredCloudConfig, 
  saveStoredCloudConfig, 
  calculateSummary, 
  generateInstallmentTransactions, 
  generateRecurringTransactions 
} from './utils/storage';
import { 
  onAuthChange, 
  logoutUser, 
  subscribeToUserTransactions, 
  saveUserTransaction, 
  batchSaveUserTransactions, 
  deleteUserTransaction, 
  deleteUserInstallmentGroup, 
  subscribeToUserBudgets, 
  saveUserBudgets, 
  subscribeToUserGoals, 
  saveUserGoals,
  subscribeToUserInvestments,
  saveUserInvestments,
  subscribeToUserCustomCategories,
  saveUserCustomCategory 
} from './utils/firebase';
import { DEFAULT_BUDGETS, CATEGORIES } from './utils/constants';
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
import { InvestmentsModal } from './components/InvestmentsModal';
import { AnnualReportModal } from './components/AnnualReportModal';
import { CloudConfigModal } from './components/CloudConfigModal';
import { AuthScreen } from './components/AuthScreen';
import { ToastProvider, useToast } from './components/Toast';

function FinanceApp() {
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Financial Data State (sempre isolados pelo UID do usuário logado)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>(DEFAULT_BUDGETS);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [investments, setInvestments] = useState<InvestmentAsset[]>(DEFAULT_INVESTMENTS);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(() => loadStoredCloudConfig());
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseSyncStatus>('unconfigured');

  // Combined Categories List (Base System Categories + User's Custom Categories)
  const allCategories = useMemo(() => {
    return [...CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Período ativo do calendário
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
  const [goalsInitialTab, setGoalsInitialTab] = useState<'reserve' | 'goals'>('reserve');
  const [isInvestmentsModalOpen, setIsInvestmentsModalOpen] = useState(false);
  const [isAnnualReportModalOpen, setIsAnnualReportModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);

  // 1. Escuta de estado de autenticação (Firebase Auth)
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (!user) {
        // Reset completo do estado ao sair: NUNCA vazar dados para o próximo login
        setTransactions([]);
        setBudgets(DEFAULT_BUDGETS);
        setGoals([]);
        setInvestments(DEFAULT_INVESTMENTS);
        setCustomCategories([]);
        setFirebaseStatus('unconfigured');
      } else {
        // Carrega cache exclusivo deste UID
        const cachedTxs = loadStoredTransactions(user.uid);
        const cachedBudgets = loadStoredBudgets(user.uid);
        const cachedGoals = loadStoredGoals(user.uid);
        const cachedInvestments = loadStoredInvestments(user.uid);
        const cachedCustomCats = loadStoredCustomCategories(user.uid);
        setTransactions(cachedTxs);
        setBudgets(cachedBudgets);
        setGoals(cachedGoals);
        setInvestments(cachedInvestments);
        setCustomCategories(cachedCustomCats);

        // Se o usuário possuir transações em Outubro/2026, posiciona o calendário no mês correto
        if (cachedTxs.some(t => t.date && t.date.startsWith('2026-10'))) {
          setPeriod({ year: 2026, month: 9 });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Limpeza de URL: remover qualquer parâmetro ?sync= legado
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('sync')) {
        url.searchParams.delete('sync');
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
      }
    }
  }, []);

  // 3. Conexão Realtime com as subcoleções Firestore do usuário autenticado: /users/{uid}/...
  useEffect(() => {
    if (!currentUser?.uid) return;

    setFirebaseStatus('syncing');

    // Escuta da subcoleção /users/{uid}/transactions
    const unsubTx = subscribeToUserTransactions(
      currentUser.uid,
      (remoteTxs) => {
        setTransactions(remoteTxs);
        saveStoredTransactions(remoteTxs, currentUser.uid);
        setFirebaseStatus('connected');

        // Se houver lançamentos em Outubro/2026, sincroniza o calendário
        if (remoteTxs.some(t => t.date && t.date.startsWith('2026-10'))) {
          setPeriod(prev => prev.month === 9 && prev.year === 2026 ? prev : { year: 2026, month: 9 });
        }
      },
      (error) => {
        console.warn('Erro ao escutar transações do usuário:', error);
        setFirebaseStatus('error');
      }
    );

    // Escuta da subcoleção /users/{uid}/budgets
    const unsubBudgets = subscribeToUserBudgets(
      currentUser.uid,
      (remoteBudgets) => {
        if (Array.isArray(remoteBudgets) && remoteBudgets.length > 0) {
          setBudgets(remoteBudgets);
          saveStoredBudgets(remoteBudgets, currentUser.uid);
        }
      }
    );

    // Escuta da subcoleção /users/{uid}/goals
    const unsubGoals = subscribeToUserGoals(
      currentUser.uid,
      (remoteGoals) => {
        setGoals(remoteGoals);
        saveStoredGoals(remoteGoals, currentUser.uid);
      }
    );

    // Escuta da subcoleção /users/{uid}/investments
    const unsubInvestments = subscribeToUserInvestments(
      currentUser.uid,
      (remoteInvestments) => {
        if (Array.isArray(remoteInvestments) && remoteInvestments.length > 0) {
          setInvestments(remoteInvestments);
          saveStoredInvestments(remoteInvestments, currentUser.uid);
        }
      }
    );

    // Escuta da subcoleção /users/{uid}/custom_categories
    const unsubCustomCats = subscribeToUserCustomCategories(
      currentUser.uid,
      (remoteCats) => {
        if (Array.isArray(remoteCats)) {
          setCustomCategories(remoteCats);
          saveStoredCustomCategories(remoteCats, currentUser.uid);
        }
      }
    );

    return () => {
      unsubTx();
      unsubBudgets();
      unsubGoals();
      unsubInvestments();
      unsubCustomCats();
    };
  }, [currentUser?.uid]);

  // Salvar configurações do Supabase (opcional)
  useEffect(() => {
    saveStoredCloudConfig(cloudConfig);
  }, [cloudConfig]);

  // Transações filtradas pelo mês selecionado
  const monthTransactions = useMemo(() => {
    const targetMonthStr = String(period.month + 1).padStart(2, '0');
    const targetPrefix = `${period.year}-${targetMonthStr}`;

    return transactions.filter(t => {
      if (!t.date) return false;
      return t.date.startsWith(targetPrefix);
    });
  }, [transactions, period]);

  // Resumo financeiro do mês
  const summary = useMemo(() => {
    return calculateSummary(monthTransactions, budgets);
  }, [monthTransactions, budgets]);

  // Logout seguro do usuário
  const handleLogout = async () => {
    try {
      await logoutUser();
      showToast('Sessão encerrada com sucesso', 'info');
      setTransactions([]);
      setBudgets(DEFAULT_BUDGETS);
      setGoals([]);
      setInvestments(DEFAULT_INVESTMENTS);
      setCustomCategories([]);
      setCurrentUser(null);
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  // Handlers para Transações (Operações diretas na subcoleção /users/{uid}/transactions)
  const handleSaveTransaction = async (
    data: Omit<Transaction, 'id' | 'createdAt'>,
    id?: string,
    installmentsCount?: number,
    recurringMonths?: number
  ) => {
    if (!currentUser?.uid) return;

    if (id) {
      // Edição de transação existente
      const existing = transactions.find(t => t.id === id);
      const updatedTx: Transaction = {
        ...data,
        id,
        createdAt: existing?.createdAt || Date.now(),
      };
      setTransactions(prev => prev.map(t => (t.id === id ? updatedTx : t)));
      await saveUserTransaction(currentUser.uid, updatedTx);
      showToast('Transação atualizada com sucesso!');
    } else if (installmentsCount && installmentsCount > 1) {
      // Criação de parcelamento
      const installmentTxs = generateInstallmentTransactions(data, installmentsCount);
      setTransactions(prev => [...installmentTxs, ...prev]);
      await batchSaveUserTransactions(currentUser.uid, installmentTxs);
      showToast(`${data.type === 'income' ? 'Receita parcelada' : 'Compra parcelada'} em ${installmentsCount}x cadastrada!`);
    } else if (recurringMonths && recurringMonths > 1) {
      // Criação de lançamentos recorrentes
      const recurringTxs = generateRecurringTransactions(data, recurringMonths);
      setTransactions(prev => [...recurringTxs, ...prev]);
      await batchSaveUserTransactions(currentUser.uid, recurringTxs);
      showToast(`Lançamento recorrente projetado para ${recurringMonths} meses!`);
    } else {
      // Nova transação individual
      const newTx: Transaction = {
        ...data,
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
      };
      setTransactions(prev => [newTx, ...prev]);
      await saveUserTransaction(currentUser.uid, newTx);
      showToast('Lançamento adicionado com sucesso!');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!currentUser?.uid) return;
    setTransactions(prev => prev.filter(t => t.id !== id));
    await deleteUserTransaction(currentUser.uid, id);
    showToast('Lançamento removido', 'info');
  };

  const handleDeleteInstallmentGroup = async (groupId: string) => {
    if (!currentUser?.uid) return;
    await deleteUserInstallmentGroup(currentUser.uid, groupId, transactions);
    setTransactions(prev => prev.filter(t => t.installmentGroupId !== groupId));
    showToast('Todas as parcelas foram excluídas', 'info');
  };

  const handleToggleStatus = async (id: string) => {
    if (!currentUser?.uid) return;
    const target = transactions.find(t => t.id === id);
    if (!target) return;
    const nextStatus = target.status === 'paid' ? 'pending' : 'paid';
    const updated = { ...target, status: nextStatus as 'paid' | 'pending' };
    setTransactions(prev => prev.map(t => (t.id === id ? updated : t)));
    await saveUserTransaction(currentUser.uid, updated);
    showToast(nextStatus === 'paid' ? 'Marcado como pago' : 'Marcado como pendente');
  };

  const handleOpenNewTransaction = () => {
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };

  // Handlers para Orçamentos (Subcoleção /users/{uid}/budgets)
  const handleSaveBudgets = async (newBudgets: CategoryBudget[]) => {
    if (!currentUser?.uid) return;
    setBudgets(newBudgets);
    await saveUserBudgets(currentUser.uid, newBudgets);
    showToast('Tetos orçamentários atualizados com sucesso!');
  };

  // Handlers para Metas (Subcoleção /users/{uid}/goals)
  const handleSaveGoals = async (newGoals: FinancialGoal[]) => {
    if (!currentUser?.uid) return;
    setGoals(newGoals);
    await saveUserGoals(currentUser.uid, newGoals);
    showToast('Metas financeiras salvas!');
  };

  // Saldo da Reserva de Emergência para cálculo de Patrimônio Consolidado
  const emergencyFundBalance = useMemo(() => {
    const fund = goals.find(g => g.isEmergencyFund);
    return fund ? (fund.currentAmount || 0) : 0;
  }, [goals]);

  // Handlers para Investimentos e Patrimônio (Subcoleção /users/{uid}/investments)
  const handleSaveInvestments = async (newInvestments: InvestmentAsset[]) => {
    if (!currentUser?.uid) return;
    setInvestments(newInvestments);
    saveStoredInvestments(newInvestments, currentUser.uid);
    await saveUserInvestments(currentUser.uid, newInvestments);
    showToast('Patrimônio e investimentos atualizados com sucesso!');
  };

  // Handler para Categoria Personalizada (Subcoleção /users/{uid}/custom_categories)
  const handleSaveCustomCategory = async (newCategory: Category) => {
    if (!currentUser?.uid) return;
    setCustomCategories(prev => {
      const exists = prev.some(c => c.id === newCategory.id);
      const updated = exists ? prev.map(c => c.id === newCategory.id ? newCategory : c) : [...prev, newCategory];
      saveStoredCustomCategories(updated, currentUser.uid);
      return updated;
    });
    await saveUserCustomCategory(currentUser.uid, newCategory);
    showToast(`Categoria "${newCategory.name}" criada com sucesso!`);
  };

  // Handlers para Backup / Importação
  const handleImportData = async (
    newTransactions: Transaction[], 
    newBudgets: CategoryBudget[],
    newGoals?: FinancialGoal[],
    newInvestments?: InvestmentAsset[],
    newCustomCategories?: Category[]
  ) => {
    if (!currentUser?.uid) return;
    setTransactions(newTransactions);
    if (newBudgets && newBudgets.length > 0) setBudgets(newBudgets);
    if (newGoals && newGoals.length > 0) setGoals(newGoals);
    if (newInvestments && newInvestments.length > 0) {
      setInvestments(newInvestments);
      saveStoredInvestments(newInvestments, currentUser.uid);
      await saveUserInvestments(currentUser.uid, newInvestments);
    }
    if (newCustomCategories && newCustomCategories.length > 0) {
      setCustomCategories(newCustomCategories);
      saveStoredCustomCategories(newCustomCategories, currentUser.uid);
      for (const cat of newCustomCategories) {
        await saveUserCustomCategory(currentUser.uid, cat);
      }
    }

    if (newTransactions.length > 0) {
      await batchSaveUserTransactions(currentUser.uid, newTransactions);
    }
    if (newBudgets && newBudgets.length > 0) {
      await saveUserBudgets(currentUser.uid, newBudgets);
    }
    if (newGoals && newGoals.length > 0) {
      await saveUserGoals(currentUser.uid, newGoals);
    }
    showToast('Dados restaurados com sucesso!');
  };

  const handleResetToSample = () => {
    setTransactions([]);
    setBudgets(DEFAULT_BUDGETS);
    showToast('Dados reinicializados', 'info');
  };

  const handleClearAll = async () => {
    if (!currentUser?.uid) return;
    for (const tx of transactions) {
      await deleteUserTransaction(currentUser.uid, tx.id);
    }
    setTransactions([]);
    showToast('Todas as transações foram excluídas', 'info');
  };

  const handleApplyCloudData = (
    cloudTxs: Transaction[],
    cloudBudgets: CategoryBudget[],
    cloudGoals: FinancialGoal[]
  ) => {
    setTransactions(cloudTxs);
    setBudgets(cloudBudgets);
    setGoals(cloudGoals);
    showToast('Dados da nuvem aplicados!');
  };

  // 1. Tela de Carregamento da Sessão
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/20 animate-pulse">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2.5 text-slate-400 text-xs font-medium">
            <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Carregando ambiente seguro...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Proteção Total de Rotas: se não autenticado, renderiza exclusivamente a tela de Login/Cadastro
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-100 selection:text-emerald-900 transition-colors">
      
      {/* Top Header */}
      <Header
        period={period}
        onPeriodChange={setPeriod}
        onOpenNewTransaction={handleOpenNewTransaction}
        onOpenBudgets={() => setIsBudgetModalOpen(true)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenGoals={() => {
          setGoalsInitialTab('goals');
          setIsGoalsModalOpen(true);
        }}
        onOpenReserve={() => {
          setGoalsInitialTab('reserve');
          setIsGoalsModalOpen(true);
        }}
        onOpenInvestments={() => setIsInvestmentsModalOpen(true)}
        onOpenAnnualReport={() => setIsAnnualReportModalOpen(true)}
        onOpenCloud={() => setIsCloudModalOpen(true)}
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
          categories={allCategories}
        />

        {/* Extrato & Transaction List */}
        <TransactionList
          transactions={monthTransactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          onDeleteGroup={handleDeleteInstallmentGroup}
          onToggleStatus={handleToggleStatus}
          onAddNew={handleOpenNewTransaction}
          categories={allCategories}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 transition-colors no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Finance Pro • Ambiente executivo isolado por credencial autenticada</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsInvestmentsModalOpen(true)}
              className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium cursor-pointer"
            >
              Patrimônio & Investimentos
            </button>
            <span>•</span>
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
        customCategories={customCategories}
        onSaveCustomCategory={handleSaveCustomCategory}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentBudgets={budgets}
        onSaveBudgets={handleSaveBudgets}
        transactionsThisMonth={monthTransactions}
        categories={allCategories}
      />

      <GoalsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        goals={goals}
        onSaveGoals={handleSaveGoals}
        initialTab={goalsInitialTab}
        monthlyIncome={summary.totalIncome}
        currentPeriod={period}
      />

      <InvestmentsModal
        isOpen={isInvestmentsModalOpen}
        onClose={() => setIsInvestmentsModalOpen(false)}
        investments={investments}
        onSaveInvestments={handleSaveInvestments}
        emergencyFundBalance={emergencyFundBalance}
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

      <ExportImportModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        transactions={transactions}
        budgets={budgets}
        goals={goals}
        investments={investments}
        customCategories={customCategories}
        onImportData={handleImportData}
        onResetToSample={handleResetToSample}
        onClearAll={handleClearAll}
      />

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <FinanceApp />
    </ToastProvider>
  );
}
