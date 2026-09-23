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
  FirebaseConfig, 
  FirebaseSyncSettings, 
  WorkspaceRemoteData, 
  Transaction, 
  CategoryBudget, 
  FinancialGoal 
} from '../types';

const STORAGE_KEYS = {
  FIREBASE_SETTINGS: 'financas_mensais_firebase_settings_v1',
  DEVICE_ID: 'financas_mensais_device_id_v1',
};

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

// Chave padrão gerada para o usuário caso não tenha definida
export function generateDefaultSyncKey(): string {
  return `FIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// Configurações padrão do projeto oficial finance-f69a2
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyDpEq4LFdM2EpkqOKUnUYmJtP9vqvdkvpo",
  authDomain: "finance-f69a2.firebaseapp.com",
  projectId: "finance-f69a2",
  storageBucket: "finance-f69a2.firebasestorage.app",
  messagingSenderId: "71598607672",
  appId: "1:71598607672:web:abceb1b0b576dcd75845cd",
};

// Configurações padrão ou provenientes de variáveis de ambiente VITE_
export function loadStoredFirebaseSettings(): FirebaseSyncSettings {
  let syncKey = 'FIN-MOISES';

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FIREBASE_SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw) as FirebaseSyncSettings;
        if (parsed.syncKey && parsed.syncKey.trim()) {
          syncKey = parsed.syncKey.trim().toUpperCase();
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações do Firebase do localStorage:', err);
    }
  }

  // Tentar carregar de variáveis de ambiente se configuradas no Vercel/Vite
  const envApiKey = import.meta.env?.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env?.VITE_FIREBASE_PROJECT_ID;
  const envAppId = import.meta.env?.VITE_FIREBASE_APP_ID;

  const envConfig: FirebaseConfig = (envApiKey && envProjectId && envAppId) ? {
    apiKey: envApiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
    projectId: envProjectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: envAppId,
  } : DEFAULT_FIREBASE_CONFIG;

  return {
    enabled: true,
    syncKey,
    config: envConfig,
  };
}

export function saveStoredFirebaseSettings(settings: FirebaseSyncSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.FIREBASE_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Erro ao salvar configurações do Firebase:', err);
  }
}

// Instância singleton do Firebase
let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let activeConfigKey = '';

export function getFirebaseInstance(config: FirebaseConfig): { app: FirebaseApp; db: Firestore } {
  const configKey = `${config.projectId}_${config.apiKey}`;
  
  if (cachedApp && cachedDb && activeConfigKey === configKey) {
    return { app: cachedApp, db: cachedDb };
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

  cachedApp = app;
  cachedDb = db;
  activeConfigKey = configKey;

  return { app, db };
}

// Parser inteligente para que o usuário possa colar o objeto completo copiado do console do Firebase
export function parseFirebaseConfigInput(input: string): FirebaseConfig | null {
  if (!input || !input.trim()) return null;

  const trimmed = input.trim();

  // Caso 1: JSON direto
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.apiKey && parsed.projectId) {
      return {
        apiKey: parsed.apiKey,
        authDomain: parsed.authDomain,
        projectId: parsed.projectId,
        storageBucket: parsed.storageBucket,
        messagingSenderId: parsed.messagingSenderId,
        appId: parsed.appId || '',
      };
    }
  } catch {
    // Continua para extração regex caso não seja JSON estrito
  }

  // Caso 2: Objeto JavaScript copiado do Firebase (const firebaseConfig = { ... };)
  const extractField = (key: string): string => {
    const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`, 'i');
    const match = trimmed.match(regex);
    return match ? match[1].trim() : '';
  };

  const apiKey = extractField('apiKey');
  const projectId = extractField('projectId');
  const appId = extractField('appId');
  const authDomain = extractField('authDomain');
  const storageBucket = extractField('storageBucket');
  const messagingSenderId = extractField('messagingSenderId');

  if (apiKey && projectId) {
    return {
      apiKey,
      projectId,
      appId: appId || '',
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      storageBucket: storageBucket || `${projectId}.appspot.com`,
      messagingSenderId: messagingSenderId || '',
    };
  }

  return null;
}

// Ouvinte em tempo real (Realtime Listener Desktop ↔ Mobile)
export function subscribeToWorkspaceRealtime(
  config: FirebaseConfig,
  syncKey: string,
  onData: (data: WorkspaceRemoteData, isRemoteChange: boolean) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const { db } = getFirebaseInstance(config);
    const safeKey = syncKey.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
    const workspaceRef = doc(db, 'finance_workspaces', safeKey);
    const myDeviceId = getDeviceId();
    let isFirstSnapshot = true;

    const unsubscribe = onSnapshot(
      workspaceRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          onData({
            transactions: [],
            budgets: [],
            goals: [],
            updatedAt: 0,
            updatedByDeviceId: '',
          }, false);
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
        console.error('Erro no listener em tempo real do Firebase Firestore:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error('Falha ao inicializar o listener do Firebase:', err);
    if (onError) onError(err);
    return () => {};
  }
}

// Gravação remota em tempo real com controle de dispositivo
export async function pushWorkspaceData(
  config: FirebaseConfig,
  syncKey: string,
  data: {
    transactions?: Transaction[];
    budgets?: CategoryBudget[];
    goals?: FinancialGoal[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = getFirebaseInstance(config);
    const safeKey = syncKey.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
    const workspaceRef = doc(db, 'finance_workspaces', safeKey);
    const myDeviceId = getDeviceId();

    const payload: Record<string, any> = {
      updatedAt: Date.now(),
      updatedByDeviceId: myDeviceId,
    };

    if (data.transactions !== undefined) payload.transactions = data.transactions;
    if (data.budgets !== undefined) payload.budgets = data.budgets;
    if (data.goals !== undefined) payload.goals = data.goals;

    // Remove qualquer propriedade undefined para compatibilidade garantida com Firestore
    const cleanPayload = JSON.parse(JSON.stringify(payload));

    await setDoc(workspaceRef, cleanPayload, { merge: true });

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao enviar dados para o Firebase Firestore:', err);
    return { success: false, error: err.message || 'Erro desconhecido ao salvar no Firebase' };
  }
}

// Puxar dados da nuvem manualmente
export async function fetchWorkspaceData(
  config: FirebaseConfig,
  syncKey: string
): Promise<{ success: boolean; data?: WorkspaceRemoteData; error?: string }> {
  try {
    const { db } = getFirebaseInstance(config);
    const safeKey = syncKey.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
    const workspaceRef = doc(db, 'finance_workspaces', safeKey);

    const docSnap = await getDoc(workspaceRef);
    if (!docSnap.exists()) {
      return { success: true, data: undefined };
    }

    const raw = docSnap.data() as Partial<WorkspaceRemoteData>;
    return {
      success: true,
      data: {
        transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
        budgets: Array.isArray(raw.budgets) ? raw.budgets : [],
        goals: Array.isArray(raw.goals) ? raw.goals : [],
        updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
        updatedByDeviceId: raw.updatedByDeviceId,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar dados' };
  }
}

// Testar conexão com o Firestore
export async function testFirebaseConnection(
  config: FirebaseConfig,
  syncKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { db } = getFirebaseInstance(config);
    const safeKey = syncKey.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
    const pingRef = doc(db, 'finance_workspaces', safeKey);

    // Tenta leitura do documento
    await getDoc(pingRef);
    return { 
      success: true, 
      message: 'Conexão estabelecida com sucesso com o Cloud Firestore!' 
    };
  } catch (err: any) {
    return { 
      success: false, 
      message: err.message || 'Falha ao conectar ao Cloud Firestore. Verifique as credenciais e regras de segurança.' 
    };
  }
}

// Gerar link compartilhável para abrir no celular e emparelhar na hora
export function getMobilePairingUrl(syncKey: string): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const path = window.location.pathname;
  return `${origin}${path}?sync=${encodeURIComponent(syncKey.trim().toUpperCase())}`;
}

// Detectar se o usuário abriu através de um link com ?sync=CHAVE
export function checkUrlForSyncKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const syncParam = params.get('sync');
    if (syncParam && syncParam.trim()) {
      return syncParam.trim().toUpperCase();
    }
  } catch {
    // Ignora erros de parsing
  }
  return null;
}

// Regras prontas de segurança do Firestore para exibição no modal
export const FIRESTORE_RULES_GUIDE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite leitura e escrita nas contas pela chave de sincronização
    match /finance_workspaces/{syncKey} {
      allow read, write: if true;
    }
  }
}`;
