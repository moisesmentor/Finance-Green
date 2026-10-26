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
  UserProfile,
  BankConnection,
  BankAccount,
  BankBalanceHistoryEntry,
  BankBalanceDisplayMode,
  UserSubscription,
  PlanTier
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
  loadStoredBankConnections,
  saveStoredBankConnections,
  loadStoredBankAccounts,
  saveStoredBankAccounts,
  loadStoredBankBalanceHistory,
  saveStoredBankBalanceHistory,
  loadStoredBankDisplayMode,
  saveStoredBankDisplayMode,
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
  deleteUserTransactionsBatch,
  updateUserTransactionsBatch,
  subscribeToUserBudgets, 
  saveUserBudgets, 
  subscribeToUserGoals, 
  saveUserGoals,
  subscribeToUserInvestments,
  saveUserInvestments,
  subscribeToUserCustomCategories,
  saveUserCustomCategory,
  subscribeToUserBankConnections,
  saveUserBankConnection,
  deleteUserBankConnection,
  subscribeToUserBankAccounts,
  saveUserBankAccount,
  deleteUserBankAccount,
  subscribeToUserBankBalanceHistory,
  saveUserBankBalanceHistoryEntry,
  subscribeToUserSubscription
} from './utils/firebase';
import { findSeriesTransactions, logRecurrenceAudit, RecurrenceSeriesInfo } from './utils/recurrence';
import { RecurrenceScopeModal } from './components/RecurrenceScopeModal';
import {
  AppFeatureKey,
  DEFAULT_FREE_SUBSCRIPTION,
  FEATURE_MIN_PLAN,
  PLAN_DETAILS,
  canAccessFeature,
  getEffectivePlan
} from './utils/permissions';

import { DEFAULT_BUDGETS, CATEGORIES, DEFAULT_BANK_ACCOUNTS } from './utils/constants';
import { useTheme } from './utils/useTheme';
import { getDueDateStatus } from './utils/formatters';
import { Wallet, AlertTriangle, ExternalLink } from 'lucide-react';
import { Header } from './components/Header';
import { DueAlertsBanner } from './components/DueAlertsBanner';
import { MonthlyIncomeTicker } from './components/MonthlyIncomeTicker';
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
import { ConnectedBanksModal } from './components/ConnectedBanksModal';
import { ImportBankStatementModal } from './components/ImportBankStatementModal';
import { BankAccountsModal } from './components/BankAccountsModal';
import { AuthScreen } from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { LegalPages, LegalPageType } from './components/LegalPages';
import { CheckoutSummaryModal } from './components/CheckoutSummaryModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import {
  createAsaasSubscriptionCheckout,
  changeAsaasSubscriptionPlan,
  cancelAsaasSubscription,
  requestAsaasRefund,
  deleteUserAccountAndSubscription,
} from './utils/asaasClient';
import { ToastProvider, useToast } from './components/Toast';

const PENDING_PLAN_STORAGE_KEY = 'greenfinance_pending_checkout_plan';

function loadPendingCheckoutPlan(): Exclude<PlanTier, 'free'> | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.sessionStorage.getItem(PENDING_PLAN_STORAGE_KEY);
    if (saved === 'basic' || saved === 'pro') return saved;
  } catch {
    // ignore storage errors
  }
  return null;
}

type PublicViewType = 'app' | 'assinatura' | 'register' | LegalPageType;

function getPublicViewFromUrl(): PublicViewType {
  if (typeof window === 'undefined') return 'app';
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (path === '/assinatura') return 'assinatura';
  if (path === '/termos') return 'termos';
  if (path === '/privacidade') return 'privacidade';
  if (path === '/excluir-conta') return 'excluir-conta';
  if (mode === 'register' || path === '/cadastro') return 'register';
  return 'app';
}

function FinanceApp() {
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  // Authentication & Subscription State (todo usuário novo começa em free)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription>(DEFAULT_FREE_SUBSCRIPTION);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [publicView, setPublicView] = useState<PublicViewType>(() => getPublicViewFromUrl());
  const [cameFromAssinatura, setCameFromAssinatura] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/assinatura');
  });
  const [pendingCheckoutPlan, setPendingCheckoutPlan] = useState<Exclude<PlanTier, 'free'> | null>(() =>
    loadPendingCheckoutPlan()
  );
  const [isCheckoutSummaryOpen, setIsCheckoutSummaryOpen] = useState(false);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [checkoutErrorMessage, setCheckoutErrorMessage] = useState<string | null>(null);

  const updatePendingCheckoutPlan = (plan: Exclude<PlanTier, 'free'> | null) => {
    setPendingCheckoutPlan(plan);
    if (typeof window !== 'undefined') {
      try {
        if (plan) {
          window.sessionStorage.setItem(PENDING_PLAN_STORAGE_KEY, plan);
        } else {
          window.sessionStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
        }
      } catch {
        // ignore storage errors
      }
    }
  };

  const navigatePublic = (nextView: PublicViewType) => {
    if (publicView === 'assinatura') {
      setCameFromAssinatura(true);
    }
    setPublicView(nextView);
    if (typeof window !== 'undefined') {
      const targetPath =
        nextView === 'app'
          ? '/'
          : nextView === 'assinatura'
          ? '/assinatura'
          : nextView === 'register'
          ? '/?mode=register'
          : `/${nextView}`;
      if (window.location.pathname + window.location.search !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setPublicView(getPublicViewFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Financial Data State (sempre isolados pelo UID do usuário logado)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>(DEFAULT_BUDGETS);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [investments, setInvestments] = useState<InvestmentAsset[]>(DEFAULT_INVESTMENTS);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);
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
  const [modalRecurrenceTarget, setModalRecurrenceTarget] = useState<{
    tx: Transaction;
    mode: 'delete' | 'end';
  } | null>(null);

  const modalRecurrenceSeries = useMemo(() => {
    if (!modalRecurrenceTarget) return null;
    return findSeriesTransactions(modalRecurrenceTarget.tx, transactions);
  }, [modalRecurrenceTarget, transactions]);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [goalsInitialTab, setGoalsInitialTab] = useState<'reserve' | 'goals'>('reserve');
  const [isInvestmentsModalOpen, setIsInvestmentsModalOpen] = useState(false);
  const [isAnnualReportModalOpen, setIsAnnualReportModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBankAccountsModalOpen, setIsBankAccountsModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // Filtro de categoria ativado pelo clique no card de Distribuição de Despesas
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const handleSelectCategoryFromCharts = (categoryId: string) => {
    setSelectedCategoryFilter(categoryId);
    const element = document.getElementById('section-transaction-list');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Bank Accounts State (isolados por UID do usuário logado)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => loadStoredBankAccounts(null));
  const [bankBalanceHistory, setBankBalanceHistory] = useState<BankBalanceHistoryEntry[]>(() => loadStoredBankBalanceHistory(null));
  const [bankDisplayMode, setBankDisplayMode] = useState<BankBalanceDisplayMode>(() => loadStoredBankDisplayMode(null));

  // 1. Escuta de estado de autenticação (Firebase Auth) com timeout de segurança
  useEffect(() => {
    // Timeout de segurança: nunca travar na tela de carregamento se o Firebase demorar
    const safetyTimer = setTimeout(() => {
      setIsAuthLoading(false);
    }, 2500);

    const unsubscribe = onAuthChange((user) => {
      clearTimeout(safetyTimer);
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (!user) {
        // Reset completo do estado ao sair: NUNCA vazar dados para o próximo login
        setUserSubscription(DEFAULT_FREE_SUBSCRIPTION);
        setTransactions([]);
        setBudgets(DEFAULT_BUDGETS);
        setGoals([]);
        setInvestments(DEFAULT_INVESTMENTS);
        setCustomCategories([]);
        setBankConnections([]);
        setBankAccounts(DEFAULT_BANK_ACCOUNTS);
        setBankBalanceHistory([]);
        setBankDisplayMode('separate');
        setFirebaseStatus('unconfigured');
      } else {
        // Carrega cache exclusivo deste UID
        const cachedTxs = loadStoredTransactions(user.uid);
        const cachedBudgets = loadStoredBudgets(user.uid);
        const cachedGoals = loadStoredGoals(user.uid);
        const cachedInvestments = loadStoredInvestments(user.uid);
        const cachedCustomCats = loadStoredCustomCategories(user.uid);
        const cachedBanks = loadStoredBankConnections(user.uid);
        const cachedAccounts = loadStoredBankAccounts(user.uid);
        const cachedHistory = loadStoredBankBalanceHistory(user.uid);
        const cachedDisplayMode = loadStoredBankDisplayMode(user.uid);

        setTransactions(cachedTxs);
        setBudgets(cachedBudgets);
        setGoals(cachedGoals);
        setInvestments(cachedInvestments);
        setCustomCategories(cachedCustomCats);
        setBankConnections(cachedBanks);
        setBankAccounts(cachedAccounts);
        setBankBalanceHistory(cachedHistory);
        setBankDisplayMode(cachedDisplayMode);


        // Se o usuário possuir transações em Outubro/2026, posiciona o calendário no mês correto
        if (cachedTxs.some(t => t.date && t.date.startsWith('2026-10'))) {
          setPeriod({ year: 2026, month: 9 });
        }
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
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

    // Escuta da subcoleção /users/{uid}/bankConnections (Open Finance / Pluggy)
    const unsubBanks = subscribeToUserBankConnections(
      currentUser.uid,
      (remoteBanks) => {
        if (Array.isArray(remoteBanks)) {
          setBankConnections(remoteBanks);
          saveStoredBankConnections(remoteBanks, currentUser.uid);
        }
      }
    );

    // Escuta da subcoleção /users/{uid}/bank_accounts
    const unsubBankAccounts = subscribeToUserBankAccounts(
      currentUser.uid,
      (remoteAccounts) => {
        if (remoteAccounts.length === 0) {
          // Pré-cadastra Nubank e Santander com saldo R$ 0,00 caso a lista esteja vazia
          DEFAULT_BANK_ACCOUNTS.forEach(acc => {
            saveUserBankAccount(currentUser.uid, acc);
          });
          setBankAccounts(DEFAULT_BANK_ACCOUNTS);
          saveStoredBankAccounts(DEFAULT_BANK_ACCOUNTS, currentUser.uid);
        } else {
          setBankAccounts(remoteAccounts);
          saveStoredBankAccounts(remoteAccounts, currentUser.uid);
        }
      }
    );

    // Escuta da subcoleção /users/{uid}/bank_balance_history
    const unsubHistory = subscribeToUserBankBalanceHistory(
      currentUser.uid,
      (remoteHistory) => {
        setBankBalanceHistory(remoteHistory);
        saveStoredBankBalanceHistory(remoteHistory, currentUser.uid);
      }
    );

    // Escuta do documento /users/{uid}/subscription/current (todo usuário novo sem documento começa em free)
    const unsubSubscription = subscribeToUserSubscription(
      currentUser.uid,
      (remoteSub) => {
        const effectiveSub = remoteSub || DEFAULT_FREE_SUBSCRIPTION;
        setUserSubscription(effectiveSub);
        setCurrentUser((prev) => (prev ? { ...prev, subscription: effectiveSub } : prev));
      }
    );

    return () => {
      unsubTx();
      unsubBudgets();
      unsubGoals();
      unsubInvestments();
      unsubCustomCats();
      unsubBanks();
      unsubBankAccounts();
      unsubHistory();
      unsubSubscription();
    };

  }, [currentUser?.uid]);

  // Verifica se o nível de acesso atual do usuário permite usar um recurso (baseado na tabela única FEATURE_MIN_PLAN)
  const checkFeatureOrNotify = (feature: AppFeatureKey): boolean => {
    if (canAccessFeature(feature, userSubscription, currentUser?.email)) {
      return true;
    }
    const featureConfig = FEATURE_MIN_PLAN[feature];
    const requiredPlanName = PLAN_DETAILS[featureConfig.minPlan].name;
    showToast(
      `O recurso "${featureConfig.label}" faz parte do plano ${requiredPlanName}.`,
      'info',
      {
        label: 'Ver Planos',
        onClick: () => navigatePublic('assinatura'),
      }
    );
    return false;
  };

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

  // Contas a vencer urgentes ou atrasadas (geral de todas as transações pendentes)
  const urgentAlertsCount = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'expense' || t.status !== 'pending' || !t.date) return false;
      const st = getDueDateStatus(t.date);
      return st.urgency === 'overdue' || st.urgency === 'today' || st.urgency === 'upcoming';
    }).length;
  }, [transactions]);

  // Logout seguro do usuário
  const handleLogout = async () => {
    try {
      await logoutUser();
      showToast('Sessão encerrada com sucesso', 'info');
      setUserSubscription(DEFAULT_FREE_SUBSCRIPTION);
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
    recurringMonths?: number,
    editScope?: 'single' | 'future' | 'all'
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

      if ((editScope === 'future' || editScope === 'all') && existing) {
        // Encontra todos os meses da série para atualizar em lote
        const series = findSeriesTransactions(existing, transactions);
        const targetTxs = editScope === 'future' ? series.future : series.all.filter(t => t.id !== id);

        if (targetTxs.length > 0) {
          const updates = targetTxs.map(f => ({
            id: f.id,
            data: {
              description: f.installmentTotal && f.installmentCurrent
                ? `${data.description.replace(/\s*[\(\[]\s*\d+\s*(?:\/|de)\s*\d+\s*[\)\]]/gi, '')} (${f.installmentCurrent}/${f.installmentTotal})`
                : data.description,
              amount: data.amount,
              categoryId: data.categoryId,
              paymentMethod: data.paymentMethod,
              isRecurring: data.isRecurring,
              recurringFrequency: data.recurringFrequency,
            },
          }));

          setTransactions(prev =>
            prev.map(t => {
              if (t.id === id) return updatedTx;
              const match = targetTxs.find(f => f.id === t.id);
              if (match) {
                const desc = match.installmentTotal && match.installmentCurrent
                  ? `${data.description.replace(/\s*[\(\[]\s*\d+\s*(?:\/|de)\s*\d+\s*[\)\]]/gi, '')} (${match.installmentCurrent}/${match.installmentTotal})`
                  : data.description;
                return {
                  ...t,
                  description: desc,
                  amount: data.amount,
                  categoryId: data.categoryId,
                  paymentMethod: data.paymentMethod,
                  isRecurring: data.isRecurring,
                  recurringFrequency: data.recurringFrequency,
                };
              }
              return t;
            })
          );

          await saveUserTransaction(currentUser.uid, updatedTx);
          await updateUserTransactionsBatch(currentUser.uid, updates);
          const countMsg = editScope === 'future'
            ? `Lançamento e mais ${targetTxs.length} meses futuros atualizados com sucesso!`
            : `Lançamento e toda a série (${series.all.length} meses) atualizados com sucesso!`;
          showToast(countMsg);
          return;
        }
      }

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

  // Importação em Lote de Extratos Bancários (OFX / CSV) — Nível BASIC
  const handleSaveBatchImportedTransactions = async (newTxs: Transaction[]) => {
    if (!currentUser?.uid || newTxs.length === 0) return;
    if (!checkFeatureOrNotify('import_ofx_csv')) return;
    setTransactions(prev => [...newTxs, ...prev]);
    await batchSaveUserTransactions(currentUser.uid, newTxs);
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

  const handleDeleteRecurrenceScope = async (
    scope: 'single' | 'future' | 'all',
    affectedTransactions: Transaction[],
    seriesInfo: RecurrenceSeriesInfo,
    reason?: string,
    cutMonth?: string
  ) => {
    if (!currentUser?.uid || affectedTransactions.length === 0) return;

    const idsToDelete = affectedTransactions.map(t => t.id);
    const backupDeleted = [...affectedTransactions];

    // Atualização otimista na interface local
    setTransactions(prev => prev.filter(t => !idsToDelete.includes(t.id)));

    // Registro no log local de auditoria
    const totalAmount = affectedTransactions.reduce((acc, t) => acc + t.amount, 0);
    logRecurrenceAudit({
      seriesName: seriesInfo.seriesName,
      scope,
      deletedCount: idsToDelete.length,
      deletedIds: idsToDelete,
      totalAmount,
      reason,
    });

    // Exclusão atômica no Firestore via writeBatch
    await deleteUserTransactionsBatch(currentUser.uid, idsToDelete);

    // Se for 'future' e houver lançamentos que permaneceram na série, marca-os como encerrados
    let previousPastStates: { id: string; prevStatus?: 'active' | 'ended'; prevEndedAt?: string; prevReason?: string }[] = [];
    if (scope === 'future') {
      const keptTransactions = seriesInfo.all.filter(t => !idsToDelete.includes(t.id));
      if (keptTransactions.length > 0) {
        const targetMonthYear = cutMonth || seriesInfo.targetTx.date.slice(0, 7);
        previousPastStates = keptTransactions.map(p => ({
          id: p.id,
          prevStatus: p.recurrenceStatus,
          prevEndedAt: p.recurrenceEndedAt,
          prevReason: p.recurrenceReason,
        }));

        const keptUpdates = keptTransactions.map(p => ({
          id: p.id,
          data: {
            recurrenceStatus: 'ended' as const,
            recurrenceEndedAt: targetMonthYear,
            ...(reason ? { recurrenceReason: reason } : {}),
          },
        }));

        setTransactions(prev =>
          prev.map(t => {
            if (keptTransactions.some(p => p.id === t.id)) {
              return {
                ...t,
                recurrenceStatus: 'ended',
                recurrenceEndedAt: targetMonthYear,
                ...(reason ? { recurrenceReason: reason } : {}),
              };
            }
            return t;
          })
        );

        await updateUserTransactionsBatch(currentUser.uid, keptUpdates);
      }
    }

    // Mensagem de sucesso com ação de desfazer
    const toastMessage =
      scope === 'future'
        ? `Recorrência de "${seriesInfo.seriesName}" encerrada (${affectedTransactions.length} futuros removidos${reason ? ` • Motivo: ${reason}` : ''})`
        : scope === 'all'
          ? `Toda a série de "${seriesInfo.seriesName}" foi excluída (${affectedTransactions.length} lançamentos)`
          : `Lançamento do mês de "${seriesInfo.seriesName}" excluído`;

    showToast(toastMessage, 'info', {
      label: 'Desfazer',
      onClick: async () => {
        // Restaura lançamentos excluídos
        setTransactions(prev => [...backupDeleted, ...prev]);
        await batchSaveUserTransactions(currentUser.uid, backupDeleted);

        // Reverte encerramento dos passados se houve
        if (previousPastStates.length > 0) {
          const revertUpdates = previousPastStates.map(item => ({
            id: item.id,
            data: {
              recurrenceStatus: item.prevStatus,
              recurrenceEndedAt: item.prevEndedAt,
              recurrenceReason: item.prevReason,
            },
          }));
          await updateUserTransactionsBatch(currentUser.uid, revertUpdates);
        }

        showToast('Ação desfeita! Lançamentos restaurados.', 'info');
      },
    });
  };

  const handleToggleStatus = async (id: string) => {
    if (!currentUser?.uid) return;
    const target = transactions.find(t => t.id === id);
    if (!target) return;
    const nextStatus = target.status === 'paid' ? 'pending' : 'paid';
    const isIncome = target.type === 'income';
    const updated = { ...target, status: nextStatus as 'paid' | 'pending' };
    setTransactions(prev => prev.map(t => (t.id === id ? updated : t)));
    await saveUserTransaction(currentUser.uid, updated);
    
    const message = nextStatus === 'paid'
      ? (isIncome ? 'Receita marcada como recebida' : 'Marcado como pago')
      : (isIncome ? 'Marcado como a receber' : 'Marcado como pendente');

    showToast(
      message,
      'info',
      {
        label: 'Desfazer',
        onClick: async () => {
          const reverted = { ...target };
          setTransactions(prev => prev.map(t => (t.id === id ? reverted : t)));
          await saveUserTransaction(currentUser.uid, reverted);
          showToast('Status revertido!', 'info');
        },
      }
    );
  };

  const handleMarkAsPaid = async (id: string, paymentDate?: string) => {
    if (!currentUser?.uid) return;
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    const previousStatus = target.status;
    const previousDate = target.date;
    const newDate = paymentDate || target.date;
    const isIncome = target.type === 'income';

    const updated: Transaction = {
      ...target,
      status: 'paid',
      date: newDate,
    };

    setTransactions(prev => prev.map(t => (t.id === id ? updated : t)));
    await saveUserTransaction(currentUser.uid, updated);

    showToast(
      isIncome ? 'Receita marcada como recebida!' : 'Conta marcada como paga!',
      'success',
      {
        label: 'Desfazer',
        onClick: async () => {
          const reverted: Transaction = {
            ...target,
            status: previousStatus,
            date: previousDate,
          };
          setTransactions(prev => prev.map(t => (t.id === id ? reverted : t)));
          await saveUserTransaction(currentUser.uid, reverted);
          showToast(isIncome ? 'Recebimento desfeito!' : 'Pagamento desfeito!', 'info');
        },
      }
    );
  };

  const handleOpenNewTransaction = () => {
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };

  // Handlers para Orçamentos (Subcoleção /users/{uid}/budgets — Nível BASIC)
  const handleSaveBudgets = async (newBudgets: CategoryBudget[]) => {
    if (!currentUser?.uid) return;
    if (!checkFeatureOrNotify('category_budgets_and_alerts')) return;
    setBudgets(newBudgets);
    saveStoredBudgets(newBudgets, currentUser.uid);
    const res = await saveUserBudgets(currentUser.uid, newBudgets);
    if (res.success) {
      showToast('Tetos orçamentários atualizados com sucesso!');
    } else {
      console.warn('Orçamentos salvos localmente, sincronização remota pendente:', res.error);
      showToast('Tetos salvos localmente!', 'info');
    }
  };


  // Handlers para Metas (Subcoleção /users/{uid}/goals — Nível PRO)
  const handleSaveGoals = async (newGoals: FinancialGoal[]) => {
    if (!currentUser?.uid) return;
    if (!checkFeatureOrNotify('emergency_fund_and_goals')) return;
    setGoals(newGoals);
    await saveUserGoals(currentUser.uid, newGoals);
    showToast('Metas financeiras salvas!');
  };

  // Saldo da Reserva de Emergência para cálculo de Patrimônio Consolidado
  const emergencyFundBalance = useMemo(() => {
    const fund = goals.find(g => g.isEmergencyFund);
    return fund ? (fund.currentAmount || 0) : 0;
  }, [goals]);

  // Handlers para Investimentos e Patrimônio (Subcoleção /users/{uid}/investments — Nível PRO)
  const handleSaveInvestments = async (newInvestments: InvestmentAsset[]) => {
    if (!currentUser?.uid) return;
    if (!checkFeatureOrNotify('patrimony_and_investments')) return;
    setInvestments(newInvestments);
    saveStoredInvestments(newInvestments, currentUser.uid);
    await saveUserInvestments(currentUser.uid, newInvestments);
    showToast('Patrimônio e investimentos atualizados com sucesso!');
  };

  // Handler para Categoria Personalizada (Subcoleção /users/{uid}/custom_categories — Nível BASIC)
  const handleSaveCustomCategory = async (newCategory: Category) => {
    if (!currentUser?.uid) return;
    if (!checkFeatureOrNotify('custom_categories')) return;
    setCustomCategories(prev => {
      const exists = prev.some(c => c.id === newCategory.id);
      const updated = exists ? prev.map(c => c.id === newCategory.id ? newCategory : c) : [...prev, newCategory];
      saveStoredCustomCategories(updated, currentUser.uid);
      return updated;
    });
    await saveUserCustomCategory(currentUser.uid, newCategory);
    showToast(`Categoria "${newCategory.name}" criada com sucesso!`);
  };

  // Handlers para Conexões Bancárias (Subcoleção /users/{uid}/bankConnections - Open Finance)
  const handleSaveBankConnection = async (connection: BankConnection) => {
    if (!currentUser?.uid) return;
    setBankConnections(prev => {
      const exists = prev.some(c => c.id === connection.id || c.itemId === connection.itemId);
      const updated = exists 
        ? prev.map(c => (c.id === connection.id || c.itemId === connection.itemId) ? connection : c)
        : [connection, ...prev];
      saveStoredBankConnections(updated, currentUser.uid);
      return updated;
    });
    await saveUserBankConnection(currentUser.uid, connection);
  };

  const handleDeleteBankConnection = async (connectionId: string) => {
    if (!currentUser?.uid) return;
    setBankConnections(prev => {
      const updated = prev.filter(c => c.id !== connectionId && c.itemId !== connectionId);
      saveStoredBankConnections(updated, currentUser.uid);
      return updated;
    });
    await deleteUserBankConnection(currentUser.uid, connectionId);
  };

  // Handlers para Contas Bancárias (Subcoleção /users/{uid}/bank_accounts — Nível FREE)
  const handleSaveBankAccount = async (account: BankAccount) => {
    if (!currentUser?.uid) return;
    setBankAccounts(prev => {
      const exists = prev.some(a => a.id === account.id);
      const updated = exists ? prev.map(a => a.id === account.id ? account : a) : [...prev, account];
      saveStoredBankAccounts(updated, currentUser.uid);
      return updated;
    });
    await saveUserBankAccount(currentUser.uid, account);
    showToast('Conta bancária salva com sucesso!');
  };

  const handleDeleteBankAccount = async (accountId: string) => {
    if (!currentUser?.uid) return;
    setBankAccounts(prev => {
      const updated = prev.filter(a => a.id !== accountId);
      saveStoredBankAccounts(updated, currentUser.uid);
      return updated;
    });
    await deleteUserBankAccount(currentUser.uid, accountId);
    showToast('Conta bancária excluída com sucesso.', 'info');
  };

  const handleSaveBankBalanceHistoryEntry = async (entry: BankBalanceHistoryEntry) => {
    if (!currentUser?.uid) return;
    setBankBalanceHistory(prev => {
      const updated = [entry, ...prev];
      saveStoredBankBalanceHistory(updated, currentUser.uid);
      return updated;
    });
    await saveUserBankBalanceHistoryEntry(currentUser.uid, entry);
  };


  // Handlers para Backup / Importação JSON (Nível BASIC)
  const handleImportData = async (
    newTransactions: Transaction[], 
    newBudgets: CategoryBudget[],
    newGoals?: FinancialGoal[],
    newInvestments?: InvestmentAsset[],
    newCustomCategories?: Category[]
  ) => {
    if (!currentUser?.uid) return;
    if (!checkFeatureOrNotify('json_backup_restore')) return;
    setTransactions(newTransactions);
    if (newBudgets && newBudgets.length > 0) {
      setBudgets(newBudgets);
      saveStoredBudgets(newBudgets, currentUser.uid);
    }
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

  // Abridores de modais protegidos pela tabela única de permissões (FEATURE_MIN_PLAN)
  const handleOpenBudgetsModal = () => {
    if (checkFeatureOrNotify('category_budgets_and_alerts')) {
      setIsBudgetModalOpen(true);
    }
  };

  const handleOpenBackupModal = () => {
    if (checkFeatureOrNotify('json_backup_restore')) {
      setIsBackupModalOpen(true);
    }
  };

  const handleOpenImportStatementModal = () => {
    if (checkFeatureOrNotify('import_ofx_csv')) {
      setIsImportModalOpen(true);
    }
  };

  const handleOpenGoalsModal = (tab: 'reserve' | 'goals') => {
    if (checkFeatureOrNotify('emergency_fund_and_goals')) {
      setGoalsInitialTab(tab);
      setIsGoalsModalOpen(true);
    }
  };

  const handleOpenInvestmentsModal = () => {
    if (checkFeatureOrNotify('patrimony_and_investments')) {
      setIsInvestmentsModalOpen(true);
    }
  };

  const handleOpenAnnualReportModal = () => {
    if (checkFeatureOrNotify('annual_report')) {
      setIsAnnualReportModalOpen(true);
    }
  };

  // Nível efetivo atual do usuário logado ('free', 'basic' ou 'pro')
  const currentEffectivePlan = useMemo(
    () => getEffectivePlan(userSubscription, currentUser?.email),
    [userSubscription, currentUser?.email]
  );

  // ETAPA 2: Fluxo dos botões da página /assinatura ("Começar grátis", "Assinar Basic", "Assinar Pro")
  const handleSelectPlanFromLanding = (plan: PlanTier) => {
    // 1. "Começar grátis"
    if (plan === 'free') {
      updatePendingCheckoutPlan(null);
      setIsCheckoutSummaryOpen(false);
      if (currentUser) {
        showToast('Você já está conectado! Aproveite o Green Finance Pro.', 'info');
        navigatePublic('app');
      } else {
        navigatePublic('register');
      }
      return;
    }

    // 2. "Assinar Basic" ou "Assinar Pro"
    updatePendingCheckoutPlan(plan);

    // 2.a) Se NÃO estiver logado: leva ao login/cadastro mantendo o plano escolhido salvo
    if (!currentUser) {
      navigatePublic('register');
      return;
    }

    // 2.c) Se já tiver o mesmo plano ativo: avisar e levar ao app
    if (currentEffectivePlan === plan) {
      updatePendingCheckoutPlan(null);
      showToast(`Você já possui o plano ${PLAN_DETAILS[plan].name} ativo na sua conta!`, 'info');
      navigatePublic('app');
      return;
    }

    // 2.b) e 2.d) Se estiver logado (em free, ou mudando entre Basic e Pro): abre a tela de resumo antes de pagar
    setIsCheckoutSummaryOpen(true);
  };

  // Quando o usuário conclui o login/cadastro tendo escolhido Basic ou Pro antes, abre o resumo automaticamente
  useEffect(() => {
    if (!currentUser || !pendingCheckoutPlan) return;

    if (currentEffectivePlan === pendingCheckoutPlan) {
      const planName = PLAN_DETAILS[pendingCheckoutPlan].name;
      updatePendingCheckoutPlan(null);
      setIsCheckoutSummaryOpen(false);
      showToast(`Você já possui o plano ${planName} ativo na sua conta!`, 'info');
      if (publicView !== 'app') {
        navigatePublic('app');
      }
      return;
    }

    setIsCheckoutSummaryOpen(true);
  }, [currentUser?.uid, pendingCheckoutPlan, currentEffectivePlan]);

  // ETAPA 3: Handler do botão "Ir para o pagamento" — cria cliente e assinatura no Asaas e redireciona
  const handleProceedToPayment = async (plan: Exclude<PlanTier, 'free'>, cpfCnpj: string) => {
    setCheckoutErrorMessage(null);
    setIsCheckoutSubmitting(true);
    try {
      const result = await createAsaasSubscriptionCheckout({
        plan,
        cpfCnpj,
        name: currentUser?.displayName,
      });
      updatePendingCheckoutPlan(null);
      window.location.href = result.checkoutUrl;
    } catch (err: any) {
      setCheckoutErrorMessage(
        err?.message || 'Não foi possível gerar o link de pagamento no Asaas. Tente novamente.'
      );
      setIsCheckoutSubmitting(false);
    }
  };

  // ETAPA 5: Handler de Upgrade (Basic -> Pro) e Downgrade (Pro -> Basic) sem duplicar assinatura
  const handleChangeSubscriptionPlan = async (targetPlan: Exclude<PlanTier, 'free'>) => {
    setCheckoutErrorMessage(null);
    setIsCheckoutSubmitting(true);
    try {
      const result = await changeAsaasSubscriptionPlan({ targetPlan });
      // Atualiza estado otimista imediatamente além do listener realtime do Firestore
      setUserSubscription((prev) => ({
        ...prev,
        plan: result.plan,
        pendingPlan: result.pendingPlan ?? null,
        updatedAt: Date.now(),
      }));
      updatePendingCheckoutPlan(null);
      setIsCheckoutSummaryOpen(false);
      setIsCheckoutSubmitting(false);
      showToast(result.message, 'success');
      if (publicView !== 'app') {
        navigatePublic('app');
      }
    } catch (err: any) {
      setCheckoutErrorMessage(
        err?.message || 'Não foi possível alterar o plano da assinatura no Asaas. Tente novamente.'
      );
      setIsCheckoutSubmitting(false);
    }
  };

  // ETAPA 6: Cancelamento em 1 clique (mantendo acesso até o fim do período já pago)
  const handleCancelSubscription = async () => {
    const result = await cancelAsaasSubscription();
    setUserSubscription((prev) => ({
      ...prev,
      plan: result.plan,
      pendingPlan: null,
      status: 'canceled',
      currentPeriodEnd: result.currentPeriodEnd,
      canceledAt: Date.now(),
      updatedAt: Date.now(),
    }));
    showToast(result.message, 'info');
  };

  // ETAPA 6: Solicitação de reembolso integral na garantia de 7 dias
  const handleRequestRefund = async () => {
    const result = await requestAsaasRefund();
    setUserSubscription((prev) => ({
      ...prev,
      plan: 'free',
      pendingPlan: null,
      status: 'canceled',
      currentPeriodEnd: Date.now(),
      refundRequestedAt: Date.now(),
      refundStatus: result.refundStatus,
      updatedAt: Date.now(),
    }));
    showToast(result.message, 'success');
  };

  // ETAPA 6: Exclusão de conta cancelando assinatura ativa no Asaas primeiro
  const handleDeleteAccount = async () => {
    const result = await deleteUserAccountAndSubscription();
    setIsSubscriptionModalOpen(false);
    await logoutUser();
    showToast(result.message, 'info');
  };

  // 1. Páginas Legais (/termos, /privacidade, /excluir-conta) acessíveis imediatamente
  if (publicView === 'termos' || publicView === 'privacidade' || publicView === 'excluir-conta') {
    return (
      <LegalPages
        page={publicView}
        theme={theme}
        onToggleTheme={toggleTheme}
        onBack={() => navigatePublic('assinatura')}
        onNavigatePage={(p) => navigatePublic(p)}
        onNavigateAuth={(mode) => {
          updatePendingCheckoutPlan(null);
          navigatePublic(mode === 'register' ? 'register' : 'app');
        }}
      />
    );
  }

  // 2. Landing Page de Vendas em /assinatura:
  // Abre SEMPRE a página de vendas em greenfinancepro.com.br/assinatura (mesmo se o usuário já estiver logado no navegador)
  if (publicView === 'assinatura') {
    return (
      <>
        <LandingPage
          theme={theme}
          onToggleTheme={toggleTheme}
          isAuthenticated={Boolean(currentUser)}
          currentEffectivePlan={currentUser ? currentEffectivePlan : undefined}
          onSelectPlan={handleSelectPlanFromLanding}
          onNavigateAuth={(mode) => {
            updatePendingCheckoutPlan(null);
            if (currentUser) {
              navigatePublic('app');
            } else {
              navigatePublic(mode === 'register' ? 'register' : 'app');
            }
          }}
          onNavigateLegal={(page) => navigatePublic(page)}
        />
        <CheckoutSummaryModal
          isOpen={isCheckoutSummaryOpen && Boolean(currentUser) && Boolean(pendingCheckoutPlan)}
          selectedPlan={pendingCheckoutPlan}
          user={currentUser}
          subscription={userSubscription}
          theme={theme}
          isSubmitting={isCheckoutSubmitting}
          errorMessage={checkoutErrorMessage}
          onClose={() => {
            setIsCheckoutSummaryOpen(false);
            setCheckoutErrorMessage(null);
            updatePendingCheckoutPlan(null);
          }}
          onProceedToPayment={handleProceedToPayment}
          onChangePlan={handleChangeSubscriptionPlan}
          onGoToApp={() => {
            setIsCheckoutSummaryOpen(false);
            setCheckoutErrorMessage(null);
            updatePendingCheckoutPlan(null);
            navigatePublic('app');
          }}
        />
      </>
    );
  }

  // 3. Tela de Carregamento da Sessão (somente para o App na raiz /)
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 dark:bg-[#060606] flex flex-col items-center justify-center p-4">
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

  // 4. Na raiz (/) ou em /?mode=register, mantém o comportamento original do app:
  // se não autenticado, exibe a tela de Login/Cadastro
  if (!currentUser) {
    return (
      <AuthScreen
        initialMode={publicView === 'register' ? 'register' : 'login'}
        pendingPlan={pendingCheckoutPlan}
        theme={theme}
        onBackToLanding={
          cameFromAssinatura || pendingCheckoutPlan
            ? () => navigatePublic('assinatura')
            : undefined
        }
        onAuthSuccess={() => {
          if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.history.replaceState({}, '', '/');
          }
          setPublicView('app');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-[#060606] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-100 selection:text-emerald-900 transition-colors duration-300">
      
      {/* Top Header */}
      <Header
        period={period}
        onPeriodChange={setPeriod}
        onOpenNewTransaction={handleOpenNewTransaction}
        onOpenBudgets={handleOpenBudgetsModal}
        onOpenBackup={handleOpenBackupModal}
        onOpenGoals={() => handleOpenGoalsModal('goals')}
        onOpenReserve={() => handleOpenGoalsModal('reserve')}
        onOpenInvestments={handleOpenInvestmentsModal}
        onOpenBankAccounts={() => setIsBankAccountsModalOpen(true)}
        onOpenAnnualReport={handleOpenAnnualReportModal}
        onOpenCloud={() => setIsCloudModalOpen(true)}
        onOpenConnectedBanks={() => setIsBankModalOpen(true)}
        connectedBanksCount={bankConnections.length}
        onOpenImportStatement={handleOpenImportStatementModal}
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
        effectivePlan={currentEffectivePlan}
        subscriptionStatus={userSubscription.status}
        firebaseStatus={firebaseStatus}
        syncKey={currentUser.uid}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={currentUser}
        onLogout={handleLogout}
        urgentAlertsCount={urgentAlertsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6 overflow-x-hidden">
        
        {/* Aviso discreto quando a assinatura estiver past_due (em atraso com tolerância ativa) */}
        {userSubscription.status === 'past_due' && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2.5 text-slate-800 dark:text-slate-200">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Atenção à sua assinatura:</strong> identificamos uma cobrança em aberto no plano{' '}
                <strong>{PLAN_DETAILS[userSubscription.plan]?.name}</strong>. Seu acesso permanece ativo
                durante o prazo de tolerância.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {userSubscription.asaasCheckoutUrl && (
                <a
                  href={userSubscription.asaasCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors"
                >
                  <span>Regularizar pagamento</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="px-3 py-1.5 rounded-lg font-semibold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10 transition-colors cursor-pointer"
              >
                Minha assinatura
              </button>
            </div>
          </div>
        )}

        {/* Due Date Payment Alerts (Boletos e Contas a Vencer) */}
        <DueAlertsBanner
          transactions={transactions}
          onMarkAsPaid={handleToggleStatus}
          categories={allCategories}
        />

        {/* Faixa Horizontal de Receitas do Mês (Ticker Animado / Chips de Entradas) */}
        <MonthlyIncomeTicker
          transactions={monthTransactions}
          onEdit={handleEditTransaction}
          onAddNew={handleOpenNewTransaction}
        />

        {/* Key Metrics Cards & Integrated Charts Grid */}
        <SummaryCards
          summary={summary}
          transactions={monthTransactions}
          allTransactions={transactions}
          period={period}
          bankAccounts={bankAccounts}
          bankDisplayMode={bankDisplayMode}
          onOpenBudgets={handleOpenBudgetsModal}
          onOpenBankAccounts={() => setIsBankAccountsModalOpen(true)}
          onMarkAsPaid={handleToggleStatus}
        >
          {/* Visual Charts & Category Spending Insights */}
          <MonthlyCharts
            transactions={monthTransactions}
            budgets={budgets}
            period={period}
            onOpenBudgets={handleOpenBudgetsModal}
            categories={allCategories}
            onSelectCategory={handleSelectCategoryFromCharts}
          />
        </SummaryCards>

        {/* Extrato & Transaction List */}
        <TransactionList
          transactions={monthTransactions}
          allTransactions={transactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          onDeleteGroup={handleDeleteInstallmentGroup}
          onDeleteRecurrenceScope={handleDeleteRecurrenceScope}
          onToggleStatus={handleToggleStatus}
          onMarkAsPaid={handleMarkAsPaid}
          onAddNew={handleOpenNewTransaction}
          onOpenImportStatement={handleOpenImportStatementModal}
          categories={allCategories}
          selectedCategoryFilter={selectedCategoryFilter}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-white/[0.08] py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#060606] transition-colors duration-300 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Finance Pro • Ambiente executivo isolado por credencial autenticada</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsBankAccountsModalOpen(true)}
              className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium cursor-pointer"
            >
              Bancos & Contas
            </button>
            <span>•</span>
            <button
              onClick={handleOpenInvestmentsModal}
              className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium cursor-pointer"
            >
              Patrimônio & Investimentos
            </button>
            <span>•</span>
            <button
              onClick={() => handleOpenGoalsModal('goals')}
              className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium cursor-pointer"
            >
              Cofrinhos & Metas
            </button>
            <span>•</span>
            <button
              onClick={handleOpenAnnualReportModal}
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
              onClick={handleOpenBackupModal}
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
        onEndRecurrence={(tx) => setModalRecurrenceTarget({ tx, mode: 'end' })}
      />

      {/* Modal de Encerramento de Recorrência (quando chamado de dentro do TransactionModal) */}
      <RecurrenceScopeModal
        isOpen={Boolean(modalRecurrenceTarget)}
        onClose={() => setModalRecurrenceTarget(null)}
        seriesInfo={modalRecurrenceSeries}
        allTransactions={transactions}
        onConfirm={async (scope, affected, reason, cutMonth) => {
          if (modalRecurrenceSeries) {
            await handleDeleteRecurrenceScope(scope, affected, modalRecurrenceSeries, reason, cutMonth);
          }
          setModalRecurrenceTarget(null);
        }}
        mode={modalRecurrenceTarget?.mode || 'end'}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentBudgets={budgets}
        onSaveBudgets={handleSaveBudgets}
        transactionsThisMonth={monthTransactions}
        categories={allCategories}
        onSaveCustomCategory={handleSaveCustomCategory}
      />

      <GoalsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        goals={goals}
        onSaveGoals={handleSaveGoals}
        initialTab={goalsInitialTab}
        monthlyIncome={summary.totalIncome}
        currentPeriod={period}
        bankAccounts={bankAccounts}
      />

      <InvestmentsModal
        isOpen={isInvestmentsModalOpen}
        onClose={() => setIsInvestmentsModalOpen(false)}
        investments={investments}
        onSaveInvestments={handleSaveInvestments}
        emergencyFundBalance={emergencyFundBalance}
        bankAccounts={bankAccounts}
        onOpenBankAccounts={() => {
          setIsInvestmentsModalOpen(false);
          setIsBankAccountsModalOpen(true);
        }}
      />

      <BankAccountsModal
        isOpen={isBankAccountsModalOpen}
        onClose={() => setIsBankAccountsModalOpen(false)}
        accounts={bankAccounts}
        history={bankBalanceHistory}
        onSaveAccount={handleSaveBankAccount}
        onDeleteAccount={handleDeleteBankAccount}
        onSaveHistoryEntry={handleSaveBankBalanceHistoryEntry}
        onAddTransaction={handleSaveTransaction}
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

      <ConnectedBanksModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        connections={bankConnections}
        onSaveConnection={handleSaveBankConnection}
        onDeleteConnection={handleDeleteBankConnection}
        onOpenImportStatement={() => {
          setIsBankModalOpen(false);
          setIsImportModalOpen(true);
        }}
        showToast={showToast}
      />

      <ImportBankStatementModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        categories={allCategories}
        existingTransactions={transactions}
        onSaveBatchTransactions={handleSaveBatchImportedTransactions}
        showToast={showToast}
      />

      <CheckoutSummaryModal
        isOpen={isCheckoutSummaryOpen && Boolean(pendingCheckoutPlan)}
        selectedPlan={pendingCheckoutPlan}
        user={currentUser}
        subscription={userSubscription}
        theme={theme}
        isSubmitting={isCheckoutSubmitting}
        errorMessage={checkoutErrorMessage}
        onClose={() => {
          setIsCheckoutSummaryOpen(false);
          setCheckoutErrorMessage(null);
          updatePendingCheckoutPlan(null);
        }}
        onProceedToPayment={handleProceedToPayment}
        onChangePlan={handleChangeSubscriptionPlan}
        onGoToApp={() => {
          setIsCheckoutSummaryOpen(false);
          setCheckoutErrorMessage(null);
          updatePendingCheckoutPlan(null);
        }}
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        user={currentUser}
        subscription={userSubscription}
        theme={theme}
        onSelectPlanForCheckout={(plan) => {
          setCheckoutErrorMessage(null);
          updatePendingCheckoutPlan(plan);
          setIsCheckoutSummaryOpen(true);
        }}
        onCancelSubscription={handleCancelSubscription}
        onRequestRefund={handleRequestRefund}
        onDeleteAccount={handleDeleteAccount}
        onOpenLandingPlans={() => navigatePublic('assinatura')}
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
