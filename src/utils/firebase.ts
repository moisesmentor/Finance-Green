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
  UserProfile
} from '../types';
import { DEFAULT_BUDGETS } from './constants';

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
  await sendPasswordResetEmail(auth, email.trim());
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
        onData(DEFAULT_BUDGETS);
        return;
      }
      const list: CategoryBudget[] = [];
      snapshot.forEach(d => list.push(d.data() as CategoryBudget));
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
    const batch = writeBatch(db);
    for (const b of budgets) {
      if (b.categoryId) {
        const bRef = doc(db, 'users', userId, 'budgets', b.categoryId);
        batch.set(bRef, JSON.parse(JSON.stringify(b)), { merge: true });
      }
    }
    await batch.commit();
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar orçamentos:', err);
    return { success: false, error: err.message };
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

// Regras de segurança oficiais do Firestore para o modo de isolamento estrito
export const FIRESTORE_AUTH_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Isolamento estrito por usuário: cada conta só acessa suas próprias subcoleções
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;
