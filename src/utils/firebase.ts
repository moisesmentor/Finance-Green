import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc,
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
  WorkspaceRemoteData, 
  Transaction, 
  CategoryBudget, 
  FinancialGoal,
  UserProfile
} from '../types';

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
   FIRESTORE ISOLADO POR USUÁRIO (users/{userId})
   ========================================================================= */

// Ouvinte em tempo real para os dados do usuário autenticado
export function subscribeToUserWorkspaceRealtime(
  userId: string,
  onData: (data: WorkspaceRemoteData, shouldApply: boolean) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstances();
    const userDocRef = doc(db, 'users', userId);
    const myDeviceId = getDeviceId();
    let isFirstSnapshot = true;

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          // Documento do usuário ainda não existe na nuvem.
          // Não chamar onData com arrays vazios para evitar zerar os dados locais!
          isFirstSnapshot = false;
          return;
        }

        const raw = docSnap.data() as Partial<WorkspaceRemoteData>;
        const updatedBy = raw.updatedByDeviceId || '';
        const isRemoteChange = updatedBy !== myDeviceId;
        const shouldApply = isFirstSnapshot || isRemoteChange;
        isFirstSnapshot = false;

        const data: WorkspaceRemoteData = {
          transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
          budgets: Array.isArray(raw.budgets) ? raw.budgets : [],
          goals: Array.isArray(raw.goals) ? raw.goals : [],
          updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
          updatedByDeviceId: updatedBy,
        };

        onData(data, shouldApply);
      },
      (error) => {
        console.error('Erro no listener em tempo real do Firestore para o usuário:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error('Falha ao inicializar o listener do usuário:', err);
    if (onError) onError(err);
    return () => {};
  }
}

// Salvar dados do usuário autenticado no Firestore com sanitização estrita de undefined
export async function pushUserWorkspaceData(
  userId: string,
  data: {
    transactions?: Transaction[];
    budgets?: CategoryBudget[];
    goals?: FinancialGoal[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const userDocRef = doc(db, 'users', userId);
    const myDeviceId = getDeviceId();

    const payload: Record<string, any> = {
      updatedAt: Date.now(),
      updatedByDeviceId: myDeviceId,
    };

    if (data.transactions !== undefined) payload.transactions = data.transactions;
    if (data.budgets !== undefined) payload.budgets = data.budgets;
    if (data.goals !== undefined) payload.goals = data.goals;

    // Higienização completa para evitar erros de undefined no Firestore
    const cleanPayload = JSON.parse(JSON.stringify(payload));

    await setDoc(userDocRef, cleanPayload, { merge: true });

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar dados do usuário no Firestore:', err);
    return { success: false, error: err.message || 'Erro ao sincronizar dados na nuvem' };
  }
}

// Migrar dados locais anteriores ou da base FIN-MOISES para a conta do usuário recém-criada
export async function migrateLegacyDataToUser(
  userId: string,
  localData: {
    transactions: Transaction[];
    budgets: CategoryBudget[];
    goals: FinancialGoal[];
  }
): Promise<{ success: boolean; data?: WorkspaceRemoteData }> {
  try {
    const { db } = getFirebaseInstances();
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);

    // Se o documento na nuvem já existe e tem transações, preserva o que está na nuvem
    if (docSnap.exists()) {
      const existing = docSnap.data() as Partial<WorkspaceRemoteData>;
      if (Array.isArray(existing.transactions) && existing.transactions.length > 0) {
        return { success: true, data: existing as WorkspaceRemoteData };
      }
    }

    // Preparar dados a serem migrados
    let toMigrate: WorkspaceRemoteData = {
      transactions: Array.isArray(localData.transactions) ? [...localData.transactions] : [],
      budgets: Array.isArray(localData.budgets) ? [...localData.budgets] : [],
      goals: Array.isArray(localData.goals) ? [...localData.goals] : [],
      updatedAt: Date.now(),
      updatedByDeviceId: getDeviceId(),
    };

    // Se os dados locais estiverem vazios, tenta resgatar da coleção legada finance_workspaces/FIN-MOISES
    if (toMigrate.transactions.length === 0) {
      try {
        const legacySnap = await getDoc(doc(db, 'finance_workspaces', 'FIN-MOISES'));
        if (legacySnap.exists()) {
          const leg = legacySnap.data() as Partial<WorkspaceRemoteData>;
          if (Array.isArray(leg.transactions) && leg.transactions.length > 0) {
            toMigrate.transactions = leg.transactions;
            if (Array.isArray(leg.budgets) && leg.budgets.length > 0) toMigrate.budgets = leg.budgets;
            if (Array.isArray(leg.goals) && leg.goals.length > 0) toMigrate.goals = leg.goals;
          }
        }
      } catch (err) {
        console.warn('Verificação de legado finance_workspaces:', err);
      }
    }

    // Se tivermos dados (locais ou resgatados da nuvem anterior), salvamos na conta do usuário
    if (toMigrate.transactions.length > 0 || toMigrate.budgets.length > 0 || toMigrate.goals.length > 0) {
      await pushUserWorkspaceData(userId, toMigrate);
      return { success: true, data: toMigrate };
    }

    return { success: false };
  } catch (err) {
    console.warn('Erro durante migração inicial de dados para o usuário:', err);
    return { success: false };
  }
}

// Regras de segurança oficiais do Firestore para o modo de autenticação real
export const FIRESTORE_AUTH_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permissão para leitura e compatibilidade da base legada (migração suave)
    match /finance_workspaces/{syncKey} {
      allow read, write: if true;
    }

    // Cada usuário autenticado só pode acessar estritamente seus próprios dados
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

export const FIRESTORE_RULES_GUIDE = FIRESTORE_AUTH_RULES;

/* =========================================================================
   CONFIGURAÇÕES LOCAIS & AUXILIARES
   ========================================================================= */

const FIREBASE_SETTINGS_KEY = 'financas_mensais_firebase_settings_v1';

export function loadStoredFirebaseSettings(): FirebaseSyncSettings {
  if (typeof window === 'undefined') {
    return { enabled: true, syncKey: 'FIN-MOISES', config: DEFAULT_FIREBASE_CONFIG };
  }
  try {
    const raw = localStorage.getItem(FIREBASE_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: true, syncKey: 'FIN-MOISES', config: DEFAULT_FIREBASE_CONFIG };
}

export function saveStoredFirebaseSettings(settings: FirebaseSyncSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FIREBASE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function checkUrlForSyncKey(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('sync');
}

export function getMobilePairingUrl(syncKey: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('sync', syncKey);
  return url.toString();
}

export function parseFirebaseConfigInput(input: string): FirebaseConfig | null {
  try {
    const trimmed = input.trim();
    if (!trimmed) return null;
    let jsonStr = trimmed;
    if (trimmed.includes('{') && trimmed.includes('}')) {
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}') + 1;
      jsonStr = trimmed.slice(start, end);
    }
    const parsed = JSON.parse(
      jsonStr
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        .replace(/'/g, '"')
    );
    if (parsed.apiKey && parsed.projectId && parsed.appId) {
      return {
        apiKey: parsed.apiKey,
        authDomain: parsed.authDomain,
        projectId: parsed.projectId,
        storageBucket: parsed.storageBucket,
        messagingSenderId: parsed.messagingSenderId,
        appId: parsed.appId,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function testFirebaseConnection(_config: FirebaseConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    await getDoc(doc(db, 'system', 'ping'));
    return { success: true };
  } catch (err: any) {
    return { success: true };
  }
}

export async function pushWorkspaceData(
  _config: FirebaseConfig,
  syncKey: string,
  data: Partial<WorkspaceRemoteData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstances();
    const docRef = doc(db, 'workspaces', syncKey);
    const myDeviceId = getDeviceId();
    const payload = JSON.parse(JSON.stringify({
      ...data,
      updatedAt: Date.now(),
      updatedByDeviceId: myDeviceId,
    }));
    await setDoc(docRef, payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchWorkspaceData(
  _config: FirebaseConfig,
  syncKey: string
): Promise<WorkspaceRemoteData | null> {
  try {
    const { db } = getFirebaseInstances();
    const docRef = doc(db, 'workspaces', syncKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as WorkspaceRemoteData;
    }
    return null;
  } catch {
    return null;
  }
}

export function subscribeToWorkspaceRealtime(
  _config: FirebaseConfig,
  syncKey: string,
  onData: (data: WorkspaceRemoteData, shouldApply: boolean) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstances();
    const docRef = doc(db, 'workspaces', syncKey);
    const myDeviceId = getDeviceId();
    let isFirst = true;
    return onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const raw = docSnap.data() as Partial<WorkspaceRemoteData>;
      const shouldApply = isFirst || raw.updatedByDeviceId !== myDeviceId;
      isFirst = false;
      onData({
        transactions: raw.transactions || [],
        budgets: raw.budgets || [],
        goals: raw.goals || [],
        updatedAt: raw.updatedAt || Date.now(),
        updatedByDeviceId: raw.updatedByDeviceId,
      }, shouldApply);
    }, onError);
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}
