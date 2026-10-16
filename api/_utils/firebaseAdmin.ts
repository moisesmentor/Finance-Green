import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Inicialização segura do Firebase Admin SDK em funções serverless da Vercel
function initFirebaseAdmin(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  // 1. Tenta carregar a chave de serviço via JSON completo em string (FIREBASE_SERVICE_ACCOUNT_KEY)
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const credentials = typeof serviceAccountJson === 'string' 
        ? JSON.parse(serviceAccountJson) 
        : serviceAccountJson;
      return initializeApp({
        credential: cert(credentials),
      });
    } catch (err) {
      console.error('Erro ao fazer parse de FIREBASE_SERVICE_ACCOUNT_KEY:', err);
    }
  }

  // 2. Tenta carregar via variáveis individuais (caso o usuário prefira não colar o JSON inteiro)
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'finance-f69a2';

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  // 3. Fallback para default application credentials
  return initializeApp({
    projectId,
  });
}

export function getAdminFirestore(): Firestore {
  initFirebaseAdmin();
  return getFirestore();
}

export interface AdminSubscriptionPayload {
  plan: 'free' | 'basic' | 'pro';
  pendingPlan?: 'free' | 'basic' | 'pro' | null;
  status: 'none' | 'pending' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'lifetime';
  asaasCustomerId?: string | null;
  asaasSubscriptionId?: string | null;
  asaasCheckoutUrl?: string | null;
  asaasLastPaymentId?: string | null;
  billingCycle?: 'MONTHLY' | 'YEARLY' | null;
  currentPeriodEnd?: number | null;
  nextDueDate?: string | null;
  subscribedAt?: number | null;
  firstPaymentConfirmedAt?: number | null;
  canceledAt?: number | null;
  refundRequestedAt?: number | null;
  updatedAt?: number;
  paymentMethod?: 'CREDIT_CARD' | 'PIX' | 'BOLETO' | 'UNDEFINED' | 'MANUAL' | null;
  isLifetime?: boolean;
  trialEndsAt?: number | null;
  customerEmail?: string | null;
}

// Grava o status da assinatura em /users/{userId}/subscription/current exclusivamente pelo servidor
export async function setServerUserSubscription(
  userId: string,
  data: Partial<AdminSubscriptionPayload>
): Promise<void> {
  const db = getAdminFirestore();
  const subRef = db.collection('users').doc(userId).collection('subscription').doc('current');
  
  await subRef.set({
    ...data,
    updatedAt: Date.now(),
  }, { merge: true });
}

// Obtém os dados da assinatura do usuário diretamente pelo servidor
export async function getServerUserSubscription(
  userId: string
): Promise<AdminSubscriptionPayload | null> {
  const db = getAdminFirestore();
  const subRef = db.collection('users').doc(userId).collection('subscription').doc('current');
  const snapshot = await subRef.get();
  
  if (!snapshot.exists) {
    return null;
  }
  return snapshot.data() as AdminSubscriptionPayload;
}
