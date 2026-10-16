import { verifyFirebaseUser } from '../_utils/auth';
import {
  getServerUserSubscription,
  setServerUserSubscription,
} from '../_utils/firebaseAdmin';
import { asaasRequest } from '../_utils/asaas';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    // 1. Valida o token do Firebase Auth enviado no header Authorization
    const authUser = await verifyFirebaseUser(req);
    if (!authUser?.uid) {
      return res.status(401).json({
        error: 'Não autorizado. Faça login novamente para continuar.',
      });
    }
    const { uid } = authUser;

    // 2. Carrega a assinatura atual do usuário no Firestore
    const existingSub = await getServerUserSubscription(uid);

    if (!existingSub || existingSub.status === 'none') {
      return res.status(400).json({
        error: 'Você não possui uma assinatura ativa para cancelar.',
      });
    }

    if (existingSub.isLifetime || existingSub.status === 'lifetime') {
      return res.status(400).json({
        error: 'Sua conta possui acesso vitalício isento de cobranças.',
      });
    }

    // Se já estiver cancelada, retorna resposta idempotente sem erro
    if (existingSub.status === 'canceled') {
      return res.status(200).json({
        success: true,
        alreadyCanceled: true,
        plan: existingSub.plan,
        status: 'canceled',
        currentPeriodEnd: existingSub.currentPeriodEnd || null,
        message: 'Sua assinatura já está cancelada. Nenhuma nova cobrança será gerada.',
      });
    }

    // 3. Se houver assinatura registrada no Asaas, encerra a recorrência via DELETE /v3/subscriptions/{id}
    if (existingSub.asaasSubscriptionId) {
      try {
        await asaasRequest(`/subscriptions/${encodeURIComponent(existingSub.asaasSubscriptionId)}`, {
          method: 'DELETE',
        });
      } catch (err: any) {
        // Se já foi removida no Asaas (404), segue normalmente para atualizar o Firestore
        if (err?.status !== 404) {
          throw err;
        }
      }
    }

    const now = Date.now();
    const hasRemainingPaidPeriod =
      existingSub.status !== 'pending' &&
      typeof existingSub.currentPeriodEnd === 'number' &&
      existingSub.currentPeriodEnd > now;

    // 4. Se o usuário já tinha pago o ciclo atual, mantém o plano atual liberado até `currentPeriodEnd`.
    // Se a assinatura estava apenas `pending` (nunca paga), volta para `free` imediatamente.
    const nextPlan = hasRemainingPaidPeriod ? existingSub.plan : 'free';
    const nextPeriodEnd = hasRemainingPaidPeriod ? existingSub.currentPeriodEnd! : null;

    await setServerUserSubscription(uid, {
      plan: nextPlan,
      pendingPlan: null,
      status: 'canceled',
      canceledAt: now,
      currentPeriodEnd: nextPeriodEnd,
    });

    const periodEndFormatted = nextPeriodEnd
      ? new Date(nextPeriodEnd).toLocaleDateString('pt-BR')
      : null;

    return res.status(200).json({
      success: true,
      plan: nextPlan,
      status: 'canceled',
      currentPeriodEnd: nextPeriodEnd,
      message: periodEndFormatted
        ? `Assinatura cancelada sem multa! Você mantém acesso completo ao plano até ${periodEndFormatted}, e depois sua conta continuará no plano Grátis com todos os dados salvos.`
        : 'Assinatura cancelada com sucesso! Nenhuma cobrança será realizada e seus dados permanecem salvos no plano Grátis.',
    });
  } catch (err: any) {
    const statusCode =
      typeof err?.status === 'number' && err.status >= 400 && err.status < 600
        ? err.status
        : 500;

    console.error('[api/asaas/cancel-subscription] Erro:', {
      status: statusCode,
      message: err?.message || 'Erro interno ao cancelar assinatura',
    });

    return res.status(statusCode).json({
      error:
        err?.message ||
        'Não foi possível cancelar a assinatura no Asaas agora. Tente novamente em instantes.',
    });
  }
}
