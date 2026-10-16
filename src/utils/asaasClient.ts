import { PlanTier } from '../types';
import { getFirebaseInstances } from './firebase';

export interface CreateSubscriptionResponse {
  checkoutUrl: string;
  subscriptionId: string;
  paymentId?: string | null;
  plan: Exclude<PlanTier, 'free'>;
  reused?: boolean;
}

/**
 * Chama a função serverless /api/asaas/create-subscription enviando o token JWT do Firebase Auth
 * e retorna o link oficial do Checkout Hospedado do Asaas (invoiceUrl).
 */
export async function createAsaasSubscriptionCheckout(params: {
  plan: Exclude<PlanTier, 'free'>;
  cpfCnpj: string;
  name?: string | null;
}): Promise<CreateSubscriptionResponse> {
  const { auth } = getFirebaseInstances();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Sua sessão expirou. Faça login novamente para continuar.');
  }

  const idToken = await currentUser.getIdToken();

  const response = await fetch('/api/asaas/create-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      plan: params.plan,
      cpfCnpj: params.cpfCnpj,
      name: params.name || currentUser.displayName || undefined,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || 'Não foi possível iniciar o pagamento no Asaas. Verifique os dados e tente novamente.'
    );
  }

  if (!data?.checkoutUrl) {
    throw new Error('Link de pagamento não retornado pelo servidor.');
  }

  return data as CreateSubscriptionResponse;
}

export interface ChangePlanResponse {
  success: boolean;
  mode: 'upgrade' | 'downgrade';
  plan: Exclude<PlanTier, 'free'>;
  pendingPlan?: Exclude<PlanTier, 'free'> | null;
  currentPeriodEnd?: number | null;
  nextDueDate?: string | null;
  message: string;
}

/**
 * Chama a função serverless /api/asaas/change-plan para alterar entre Basic e Pro
 * sem criar assinatura duplicada no Asaas.
 */
export async function changeAsaasSubscriptionPlan(params: {
  targetPlan: Exclude<PlanTier, 'free'>;
}): Promise<ChangePlanResponse> {
  const { auth } = getFirebaseInstances();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Sua sessão expirou. Faça login novamente para continuar.');
  }

  const idToken = await currentUser.getIdToken();

  const response = await fetch('/api/asaas/change-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      targetPlan: params.targetPlan,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || 'Não foi possível atualizar o plano da assinatura no momento.'
    );
  }

  return data as ChangePlanResponse;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  alreadyCanceled?: boolean;
  plan: PlanTier;
  status: 'canceled';
  currentPeriodEnd: number | null;
  message: string;
}

/**
 * Chama /api/asaas/cancel-subscription para cancelar a assinatura em 1 clique,
 * mantendo o acesso até o fim do período já pago.
 */
export async function cancelAsaasSubscription(): Promise<CancelSubscriptionResponse> {
  const { auth } = getFirebaseInstances();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Sua sessão expirou. Faça login novamente para continuar.');
  }

  const idToken = await currentUser.getIdToken();

  const response = await fetch('/api/asaas/cancel-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || 'Não foi possível cancelar sua assinatura no momento.'
    );
  }

  return data as CancelSubscriptionResponse;
}

export interface RequestRefundResponse {
  success: boolean;
  alreadyRequested?: boolean;
  refundStatus: 'refunded' | 'pending_manual';
  plan: 'free';
  status: 'canceled';
  message: string;
}

/**
 * Chama /api/asaas/request-refund para solicitar o reembolso integral dentro da garantia de 7 dias.
 */
export async function requestAsaasRefund(): Promise<RequestRefundResponse> {
  const { auth } = getFirebaseInstances();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Sua sessão expirou. Faça login novamente para continuar.');
  }

  const idToken = await currentUser.getIdToken();

  const response = await fetch('/api/asaas/request-refund', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || 'Não foi possível solicitar o reembolso agora.'
    );
  }

  return data as RequestRefundResponse;
}

/**
 * Chama /api/asaas/delete-account para cancelar a assinatura ativa no Asaas ANTES
 * de apagar os dados do usuário no Firestore e a credencial no Firebase Auth.
 */
export async function deleteUserAccountAndSubscription(): Promise<{
  success: boolean;
  message: string;
}> {
  const { auth } = getFirebaseInstances();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Sua sessão expirou. Faça login novamente para continuar.');
  }

  const idToken = await currentUser.getIdToken();

  const response = await fetch('/api/asaas/delete-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error || 'Não foi possível excluir a conta no momento.'
    );
  }

  return data;
}

