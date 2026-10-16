import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc,
  collection,
  writeBatch,
  Firestore,
  Unsubscribe 
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  User,
  Auth
} from 'firebase/auth';
import { 
  FirebaseConfig, 
  Transaction, 
  CategoryBudget, 
  FinancialGoal,
  UserProfile,
  InvestmentAsset,
  Category,
  BankConnection,
  UserSubscription,
  BankAccount,
  BankBalanceHistoryEntry
} from '../types';
import { DEFAULT_BUDGETS } from './constants';
import { loadStoredBudgets } from './storage';

const STORAGE_KEYS = {
  DEVICE_ID: 'financas_mensais_device_id_v1',
};

// Configurações padrão do projeto oficial finance-f69a2
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyDpEq4LFdM2EpkqOKUnUYmJtP9vqvdkvpo",
  authDomain: "finance-f69a2.firebaseapp.com",
  projectId: "finance-f69a2",
  storageBucket: "finance-f69a2.firebasestorage.app",
  messagingSenderId: "71598607672",
  appId: "1:71598607672:web:abceb1b0b576dcd75845cd",
};

// Obter configuração ativa (de variáveis de ambiente ou padrão)
export function getFirebaseConfig(): FirebaseConfig {
  const envApiKey = import.meta.env?.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env?.VITE_FIREBASE_PROJECT_ID;
  const envAppId = import.meta.env?.VITE_FIREBASE_APP_ID;

  if (envApiKey && envProjectId && envAppId) {
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: envAppId,
    };
  }

  return DEFAULT_FIREBASE_CONFIG;
}

// Obter ou gerar um ID único para este dispositivo/navegador
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = `dev_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
  } catch {
    return 'fallback_device';
  }
}

// Singletons do Firebase App, Firestore e Auth
let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let activeConfigKey = '';

export function getFirebaseInstances(): { app: FirebaseApp; db: Firestore; auth: Auth } {
  const config = getFirebaseConfig();
  const configKey = `${config.projectId}_${config.apiKey}`;
  
  if (cachedApp && cachedDb && cachedAuth && activeConfigKey === configKey) {
    return { app: cachedApp, db: cachedDb, auth: cachedAuth };
  }

  const existingApps = getApps();
  const app = existingApps.length > 0 
    ? getApp() 
    : initializeApp(config);

  let db: Firestore;
  try {
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    db = getFirestore(app);
  }

  const auth = getAuth(app);

  cachedApp = app;
  cachedDb = db;
  cachedAuth = auth;
  activeConfigKey = configKey;

  return { app, db, auth };
}

/* =========================================================================
   AUTENTICAÇÃO REAL (FIREBASE AUTH)
   ========================================================================= */

// Login com E-mail e Senha
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const { auth } = getFirebaseInstances();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

// Cadastro com E-mail, Senha e Nome
export async function registerWithEmail(email: string, password: string, displayName?: string): Promise<User> {
  const { auth } = getFirebaseInstances();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  
  if (displayName && displayName.trim()) {
    await updateProfile(credential.user, {
      displayName: displayName.trim(),
    });
  }
  
  return credential.user;
}

// Logout do Usuário
export async function logoutUser(): Promise<void> {
  const { auth } = getFirebaseInstances();
  await signOut(auth);
}

// Envio de E-mail de Recuperação de Senha
export async function sendPasswordReset(email: string): Promise<void> {
  const { auth } = getFirebaseInstances();
  const appUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) || 'https://greenfinancepro.com.br';
  try {
    // Configura o link do e-mail para retornar ao domínio da aplicação
    await sendPasswordResetEmail(auth, email.trim(), {
      url: appUrl,
      handleCodeInApp: false,
    });
  } catch (err) {
    // Caso o domínio ainda não esteja em Authorized Domains no Firebase, fallback seguro para o envio padrão
    console.warn('Fallback para envio de redefinição sem ActionCodeSettings:', err);
    await sendPasswordResetEmail(auth, email.trim());
  }
}

// Monitoramento de Estado da Sessão
export function onAuthChange(callback: (user: UserProfile | null) => void): Unsubscribe {
  const { auth } = getFirebaseInstances();
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      callback({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });
    } else {
      callback(null);
    }
  });
}

// Obter ID Token do usuário atual autenticado (JWT para rotas serverless /api)
export async function getCurrentUserToken(): Promise<string | null> {
  try {
    const { auth } = getFirebaseInstances();
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken(false);
  } catch (err) {
    console.error('Erro ao obter token do Firebase Auth:', err);
    return null;
  }
}


// Tradutor amigável de erros do Firebase para Português
export function translateAuthError(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'O formato do e-mail informado é inválido.';
    case 'auth/user-disabled':
      return 'Esta conta de usuário foi temporariamente suspensa.';
    case 'auth/user-not-found':
      return 'Nenhuma conta encontrada com este e-mail.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Faça login ou use "Esqueci minha senha".';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Crie uma senha com pelo menos 8 caracteres, com letras e números.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas sem sucesso. Por segurança, aguarde alguns minutos e tente novamente.';
    case 'auth/network-request-failed':
      return 'Falha de conexão com a internet. Verifique sua rede.';
    case 'auth/operation-not-allowed':
      return 'O login por E-mail/Senha ainda não foi ativado no Firebase Console (Vá em Authentication > Sign-in method e ative "E-mail/senha").';
    default:
      return errorCode
        ? `Erro de autenticação (${errorCode}). Verifique as configurações do Firebase.`
        : 'Ocorreu um erro ao processar. Tente novamente.';
  }
}

/* =========================================================================
   SUBCOLEÇÕES FIRESTORE ISOLADAS POR USUÁRIO: /users/{userId}/...
   ========================================================================= */

// 1. Escutar transações da subcoleção /users/{userId}/transactions
export function subscribeToUserTransactions(
  userId: string,
  onData: (transactions: Transaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstances();
    const txColRef = collection(db, 'users', userId, 'transactions');
    return onSnapshot(txColRef, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data() as Transaction;
        txs.push({ ...item, id: docSnap.id });
      });
      // Ordenação decrescente de data e criação
      txs.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
      onData(txs);
    }, onError);
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

// 2. Salvar ou atualizar transação individual em /users/{userId}/transactions/{txId}
export async function saveUserTransaction(
  userId: string,
  transaction: Transaction
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const txRef = doc(db, 'users', userId, 'transactions', transaction.id);
    const cleanTx = JSON.parse(JSON.stringify(transaction));
    await setDoc(txRef, cleanTx, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar transação no Firestore:', err);
    return { success: false, error: err.message };
  }
}

// 3. Salvar lote de transações (parceladas ou recorrentes)
export async function batchSaveUserTransactions(
  userId: string,
  transactions: Transaction[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const batch = writeBatch(db);
    for (const tx of transactions) {
      const txRef = doc(db, 'users', userId, 'transactions', tx.id);
      batch.set(txRef, JSON.parse(JSON.stringify(tx)), { merge: true });
    }
    await batch.commit();
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar lote de transações:', err);
    return { success: false, error: err.message };
  }
}

// 4. Excluir transação em /users/{userId}/transactions/{txId}
export async function deleteUserTransaction(
  userId: string,
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const txRef = doc(db, 'users', userId, 'transactions', transactionId);
    await deleteDoc(txRef);
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir transação no Firestore:', err);
    return { success: false, error: err.message };
  }
}

// 5. Excluir grupo de parcelamento em /users/{userId}/transactions
export async function deleteUserInstallmentGroup(
  userId: string,
  groupId: string,
  allTransactions: Transaction[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const batch = writeBatch(db);
    const toDelete = allTransactions.filter(t => t.installmentGroupId === groupId);
    for (const tx of toDelete) {
      batch.delete(doc(db, 'users', userId, 'transactions', tx.id));
    }
    await batch.commit();
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir grupo de parcelas:', err);
    return { success: false, error: err.message };
  }
}

// 6. Escutar orçamentos da subcoleção /users/{userId}/budgets
export function subscribeToUserBudgets(
  userId: string,
  onData: (budgets: CategoryBudget[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstances();
    const colRef = collection(db, 'users', userId, 'budgets');
    return onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        // Se a subcoleção remota ainda estiver vazia, tenta primeiro o cache local exclusivo deste usuário
        const cached = loadStoredBudgets(userId);
        onData(cached && cached.length > 0 ? cached : DEFAULT_BUDGETS);
        return;
      }
      const list: CategoryBudget[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        const catId = data.categoryId || data.id || data.category || d.id;
        const rawLimit = data.limit ?? data.amount ?? data.budget;
        const limit = typeof rawLimit === 'number' ? rawLimit : parseFloat(rawLimit) || 0;
        list.push({ categoryId: catId, limit });
      });
      onData(list);
    }, onError);
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

// 7. Salvar orçamentos em /users/{userId}/budgets/{categoryId}
export async function saveUserBudgets(
  userId: string,
  budgets: CategoryBudget[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    // 1. Tenta batch commit primeiro para atomicidade
    const batch = writeBatch(db);
    for (const b of budgets) {
      if (b.categoryId) {
        const bRef = doc(db, 'users', userId, 'budgets', b.categoryId);
        batch.set(bRef, {
          categoryId: b.categoryId,
          limit: Number(b.limit) || 0,
          updatedAt: Date.now(),
        }, { merge: true });
      }
    }
    await batch.commit();
    return { success: true };
  } catch (batchErr: any) {
    console.warn('Batch commit de orçamentos falhou, tentando gravação individual (setDoc):', batchErr);
    try {
      const { db } = getFirebaseInstances();
      await Promise.all(
        budgets.map(async (b) => {
          if (!b.categoryId) return;
          const bRef = doc(db, 'users', userId, 'budgets', b.categoryId);
          await setDoc(bRef, {
            categoryId: b.categoryId,
            limit: Number(b.limit) || 0,
            updatedAt: Date.now(),
          }, { merge: true });
        })
      );
      return { success: true };
    } catch (individualErr: any) {
      console.error('Erro ao salvar orçamentos no Firestore:', individualErr);
      return { success: false, error: individualErr.message };
    }
  }
}


// 8. Escutar metas da subcoleção /users/{userId}/goals
export function subscribeToUserGoals(
  userId: string,
  onData: (goals: FinancialGoal[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstances();
    const colRef = collection(db, 'users', userId, 'goals');
    return onSnapshot(colRef, (snapshot) => {
      const list: FinancialGoal[] = [];
      snapshot.forEach(d => list.push(d.data() as FinancialGoal));
      onData(list);
    }, onError);
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

// 9. Salvar metas em /users/{userId}/goals/{goalId}
export async function saveUserGoals(
  userId: string,
  goals: FinancialGoal[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const batch = writeBatch(db);
    for (const g of goals) {
      const gRef = doc(db, 'users', userId, 'goals', g.id);
      batch.set(gRef, JSON.parse(JSON.stringify(g)), { merge: true });
    }
    await batch.commit();
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar metas:', err);
    return { success: false, error: err.message };
  }
}

// 10. Escutar investimentos da subcoleção /users/{userId}/investments
export function subscribeToUserInvestments(
  userId: string,
  onData: (investments: InvestmentAsset[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstances();
    const colRef = collection(db, 'users', userId, 'investments');
    return onSnapshot(colRef, (snapshot) => {
      const list: InvestmentAsset[] = [];
      snapshot.forEach(d => list.push(d.data() as InvestmentAsset));
      onData(list);
    }, onError);
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

// 11. Salvar investimentos em /users/{userId}/investments/{assetId}
export async function saveUserInvestments(
  userId: string,
  investments: InvestmentAsset[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const batch = writeBatch(db);
    for (const inv of investments) {
      const invRef = doc(db, 'users', userId, 'investments', inv.id);
      batch.set(invRef, JSON.parse(JSON.stringify(inv)), { merge: true });
    }
    await batch.commit();
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar investimentos:', err);
    return { success: false, error: err.message };
  }
}

// 12. Excluir investimento de /users/{userId}/investments/{assetId}
export async function deleteUserInvestment(
  userId: string,
  assetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const invRef = doc(db, 'users', userId, 'investments', assetId);
    await deleteDoc(invRef);
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir investimento:', err);
    return { success: false, error: err.message };
  }
}

// 13. Escutar categorias personalizadas em /users/{userId}/custom_categories
export function subscribeToUserCustomCategories(
  userId: string,
  onData: (categories: Category[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstances();
    const colRef = collection(db, 'users', userId, 'custom_categories');
    return onSnapshot(colRef, (snapshot) => {
      const list: Category[] = [];
      snapshot.forEach(d => list.push(d.data() as Category));
      onData(list);
    }, onError);
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

// 14. Salvar categoria personalizada em /users/{userId}/custom_categories/{categoryId}
export async function saveUserCustomCategory(
  userId: string,
  category: Category
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const catRef = doc(db, 'users', userId, 'custom_categories', category.id);
    await setDoc(catRef, JSON.parse(JSON.stringify(category)), { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar categoria personalizada:', err);
    return { success: false, error: err.message };
  }
}

// 15. Excluir categoria personalizada em /users/{userId}/custom_categories/{categoryId}
export async function deleteUserCustomCategory(
  userId: string,
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const catRef = doc(db, 'users', userId, 'custom_categories', categoryId);
    await deleteDoc(catRef);
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir categoria personalizada:', err);
    return { success: false, error: err.message };
  }
}

// 16. Escutar conexões bancárias da subcoleção /users/{userId}/bankConnections
export function subscribeToUserBankConnections(
  userId: string,
  onData: (connections: BankConnection[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstances();
    const colRef = collection(db, 'users', userId, 'bankConnections');
    return onSnapshot(colRef, (snapshot) => {
      const list: BankConnection[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          itemId: data.itemId || d.id,
          institutionName: data.institutionName || 'Instituição',
          connectorId: data.connectorId,
          connectorColor: data.connectorColor,
          connectorImageUrl: data.connectorImageUrl,
          status: data.status || 'UPDATED',
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
          lastSyncAt: data.lastSyncAt,
          error: data.error || null,
        });
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onData(list);
    }, onError);
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

// 17. Salvar ou atualizar conexão bancária em /users/{userId}/bankConnections/{connectionId}
export async function saveUserBankConnection(
  userId: string,
  connection: BankConnection
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const docId = connection.id || connection.itemId;
    const docRef = doc(db, 'users', userId, 'bankConnections', docId);
    const cleanData = JSON.parse(JSON.stringify({
      ...connection,
      id: docId,
      updatedAt: Date.now(),
    }));
    await setDoc(docRef, cleanData, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar conexão bancária no Firestore:', err);
    return { success: false, error: err.message };
  }
}

// 18. Excluir conexão bancária em /users/{userId}/bankConnections/{connectionId}
export async function deleteUserBankConnection(
  userId: string,
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const docRef = doc(db, 'users', userId, 'bankConnections', connectionId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir conexão bancária:', err);
    return { success: false, error: err.message };
  }
}


// 19. Escutar status da assinatura em /users/{userId}/subscription/current
export function subscribeToUserSubscription(
  userId: string,
  onData: (subscription: UserSubscription | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstances();
    const docRef = doc(db, 'users', userId, 'subscription', 'current');
    return onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(snapshot.data() as UserSubscription);
    }, onError);
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

// Regras de segurança oficiais do Firestore com níveis de acesso (free, basic, pro) e whitelist admin
export const FIRESTORE_AUTH_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    function isAdmin() {
      return request.auth != null && (
        request.auth.token.email == 'contatomoisesrodrigues@gmail.com'
      );
    }
    function subDocPath(userId) {
      return /databases/$(database)/documents/users/$(userId)/subscription/current;
    }
    function hasValidPaidStatus(data) {
      return data.isLifetime == true
        || data.status in ['active', 'trialing', 'lifetime']
        || (
          data.status in ['past_due', 'canceled']
          && data.currentPeriodEnd is number
          && data.currentPeriodEnd > request.time.toMillis()
        );
    }
    function hasBasicOrProAccess(userId) {
      return isOwner(userId) && (
        isAdmin() || (
          exists(subDocPath(userId))
          && hasValidPaidStatus(get(subDocPath(userId)).data)
          && get(subDocPath(userId)).data.plan in ['basic', 'pro']
        )
      );
    }
    function hasProAccess(userId) {
      return isOwner(userId) && (
        isAdmin() || (
          exists(subDocPath(userId))
          && hasValidPaidStatus(get(subDocPath(userId)).data)
          && (
            get(subDocPath(userId)).data.isLifetime == true
            || (
              get(subDocPath(userId)).data.plan == 'pro'
              && !(
                get(subDocPath(userId)).data.pendingPlan == 'basic'
                && get(subDocPath(userId)).data.currentPeriodEnd is number
                && get(subDocPath(userId)).data.currentPeriodEnd <= request.time.toMillis()
              )
            )
          )
        )
      );
    }

    match /users/{userId}/subscription/{docId} {
      allow read: if isOwner(userId);
      allow write: if false;
    }
    match /users/{userId}/profile/{docId} {
      allow read, write: if isOwner(userId);
    }
    match /users/{userId}/transactions/{txId} {
      allow read, write: if isOwner(userId);
    }
    match /users/{userId}/bank_accounts/{accountId} {
      allow read, write: if isOwner(userId);
    }
    match /users/{userId}/bank_balance_history/{historyId} {
      allow read, write: if isOwner(userId);
    }
    match /users/{userId}/budgets/{budgetId} {
      allow read: if isOwner(userId);
      allow write: if hasBasicOrProAccess(userId);
    }
    match /users/{userId}/custom_categories/{catId} {
      allow read: if isOwner(userId);
      allow write: if hasBasicOrProAccess(userId);
    }
    match /users/{userId}/goals/{goalId} {
      allow read: if isOwner(userId);
      allow write: if hasProAccess(userId);
    }
    match /users/{userId}/investments/{assetId} {
      allow read: if isOwner(userId);
      allow write: if hasProAccess(userId);
    }
    match /users/{userId}/bankConnections/{connId} {
      allow read: if isOwner(userId);
      allow write: if hasProAccess(userId);
    }
  }
}`;

// 20. Escutar contas bancárias manuais da subcoleção /users/{userId}/bank_accounts
export function subscribeToUserBankAccounts(
  userId: string,
  onData: (accounts: BankAccount[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstances();
    const colRef = collection(db, 'users', userId, 'bank_accounts');
    return onSnapshot(colRef, (snapshot) => {
      const list: BankAccount[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || 'Conta',
          type: data.type || 'checking',
          currentBalance: typeof data.currentBalance === 'number' ? data.currentBalance : parseFloat(data.currentBalance) || 0,
          color: data.color || '#059669',
          icon: data.icon || 'landmark',
          isArchived: Boolean(data.isArchived),
          linkToReserve: Boolean(data.linkToReserve),
          lastUpdatedAt: data.lastUpdatedAt || Date.now(),
          createdAt: data.createdAt || Date.now(),
        });
      });
      // Ordena por data de criação
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      onData(list);
    }, onError);
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

// 21. Salvar ou atualizar conta bancária em /users/{userId}/bank_accounts/{accountId}
export async function saveUserBankAccount(
  userId: string,
  account: BankAccount
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const docId = account.id;
    const docRef = doc(db, 'users', userId, 'bank_accounts', docId);
    const cleanData = JSON.parse(JSON.stringify({
      ...account,
      id: docId,
      lastUpdatedAt: account.lastUpdatedAt || Date.now(),
    }));
    await setDoc(docRef, cleanData, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar conta bancária no Firestore:', err);
    return { success: false, error: err.message };
  }
}

// 22. Excluir conta bancária em /users/{userId}/bank_accounts/{accountId}
export async function deleteUserBankAccount(
  userId: string,
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const docRef = doc(db, 'users', userId, 'bank_accounts', accountId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir conta bancária:', err);
    return { success: false, error: err.message };
  }
}

// 23. Escutar histórico de saldos bancários da subcoleção /users/{userId}/bank_balance_history
export function subscribeToUserBankBalanceHistory(
  userId: string,
  onData: (history: BankBalanceHistoryEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstances();
    const colRef = collection(db, 'users', userId, 'bank_balance_history');
    return onSnapshot(colRef, (snapshot) => {
      const list: BankBalanceHistoryEntry[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          accountId: data.accountId,
          accountName: data.accountName || 'Conta',
          date: data.date || '',
          timestamp: data.timestamp || Date.now(),
          balance: typeof data.balance === 'number' ? data.balance : parseFloat(data.balance) || 0,
          previousBalance: typeof data.previousBalance === 'number' ? data.previousBalance : parseFloat(data.previousBalance) || 0,
          difference: typeof data.difference === 'number' ? data.difference : parseFloat(data.difference) || 0,
          changeType: data.changeType || 'adjustment',
          note: data.note || '',
        });
      });
      // Ordena decrescente por data/timestamp
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      onData(list);
    }, onError);
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

// 24. Gravar registro no histórico de saldos em /users/{userId}/bank_balance_history/{entryId}
export async function saveUserBankBalanceHistoryEntry(
  userId: string,
  entry: BankBalanceHistoryEntry
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const docRef = doc(db, 'users', userId, 'bank_balance_history', entry.id);
    const cleanData = JSON.parse(JSON.stringify(entry));
    await setDoc(docRef, cleanData, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar histórico de saldo no Firestore:', err);
    return { success: false, error: err.message };
  }
}

