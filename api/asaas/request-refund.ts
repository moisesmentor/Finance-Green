import { verifyFirebaseUser } from '../_utils/auth';
import {
  getServerUserSubscription,
  recordRefundRequest,
  setServerUserSubscription,
} from '../_utils/firebaseAdmin';
import { asaasRequest } from '../_utils/asaas';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
    const { uid, email } = authUser;

    // 2. Carrega a assinatura atual do usuário no Firestore
    const existingSub = await getServerUserSubscription(uid);

    if (!existingSub) {
      return res.status(400).json({
        error: 'Nenhuma assinatura encontrada para solicitar reembolso.',
      });
    }

    // Idempotência: se já solicitou reembolso antes, retorna sucesso
    if (existingSub.refundStatus === 'refunded' || existingSub.refundStatus === 'pending_manual') {
      return res.status(200).json({
        success: true,
        alreadyRequested: true,
        refundStatus: existingSub.refundStatus,
        message:
          existingSub.refundStatus === 'refunded'
            ? 'Seu reembolso integral já foi processado no Asaas.'
            : 'Sua solicitação de reembolso já está registrada e em processamento.',
      });
    }

    // 3. Verifica se está dentro do prazo legal de 7 dias corridos do 1º pagamento confirmado (CDC Art. 49)
    const firstPaidAt = existingSub.firstPaymentConfirmedAt || existingSub.subscribedAt;
    if (!firstPaidAt) {
      return res.status(400).json({
        error: 'Ainda não há pagamento confirmado nesta assinatura para estornar.',
      });
    }

    const elapsedMs = Date.now() - firstPaidAt;
    if (elapsedMs > SEVEN_DAYS_MS) {
      return res.status(400).json({
        error:
          'O prazo da garantia de 7 dias após o primeiro pagamento já encerrou. Você ainda pode cancelar sua assinatura a qualquer momento para interromper próximas cobranças.',
      });
    }

    // 4. Cancela imediatamente a assinatura recorrente no Asaas para impedir futuras cobranças
    if (existingSub.asaasSubscriptionId) {
      try {
        await asaasRequest(`/subscriptions/${encodeURIComponent(existingSub.asaasSubscriptionId)}`, {
          method: 'DELETE',
        });
      } catch (err: any) {
        if (err?.status !== 404) {
          console.warn('[api/asaas/request-refund] Aviso ao encerrar assinatura antes do estorno:', err?.message);
        }
      }
    }

    // 5. Localiza o pagamento confirmado (via asaasLastPaymentId ou listando os pagamentos da assinatura)
    let paymentId = existingSub.asaasLastPaymentId || null;
    let billingType = existingSub.paymentMethod || null;

    if (!paymentId && existingSub.asaasSubscriptionId) {
      try {
        const paymentsList = await asaasRequest<{
          data?: Array<{ id: string; status: string; billingType?: string }>;
        }>(`/payments?subscription=${encodeURIComponent(existingSub.asaasSubscriptionId)}&limit=10`);

        const confirmedPayment = paymentsList.data?.find(
          (p) => p.status === 'CONFIRMED' || p.status === 'RECEIVED'
        );
        if (confirmedPayment) {
          paymentId = confirmedPayment.id;
          billingType = (confirmedPayment.billingType as any) || billingType;
        }
      } catch {
        // segue com os dados existentes
      }
    }

    // 6. Tenta realizar o estorno automático no Asaas via POST /v3/payments/{id}/refund
    // No Asaas, Cartão de Crédito (CREDIT_CARD) e Pix (PIX) suportam estorno via API.
    // Pagamentos via Boleto (BOLETO) não possuem conta bancária de destino automática na API de refund.
    let refundStatus: 'refunded' | 'pending_manual' = 'pending_manual';

    if (paymentId && billingType !== 'BOLETO') {
      try {
        await asaasRequest(`/payments/${encodeURIComponent(paymentId)}/refund`, {
          method: 'POST',
          body: {
            description: 'Estorno integral solicitado pelo cliente dentro da garantia de 7 dias (Art. 49 CDC)',
          },
        });
        refundStatus = 'refunded';
      } catch (refundErr: any) {
        console.warn('[api/asaas/request-refund] Estorno automático recusado pelo Asaas, registrando para estorno manual:', {
          status: refundErr?.status,
          message: refundErr?.message,
        });
        refundStatus = 'pending_manual';
      }
    }

    const now = Date.now();

    // 7. Registra o pedido de reembolso na coleção administrativa `/refund_requests/{uid}`
    await recordRefundRequest(uid, {
      plan: existingSub.plan,
      asaasSubscriptionId: existingSub.asaasSubscriptionId || null,
      asaasPaymentId: paymentId,
      paymentMethod: billingType,
      status: refundStatus === 'refunded' ? 'refunded_automatically' : 'pending_manual',
      reason: 'Garantia de 7 dias solicitada pelo painel Minha Assinatura',
      userEmail: email || existingSub.customerEmail || null,
    });

    // 8. Rebaixa imediatamente o plano para `free` (mantendo todos os dados salvos no Firestore)
    await setServerUserSubscription(uid, {
      plan: 'free',
      pendingPlan: null,
      status: 'canceled',
      currentPeriodEnd: now,
      canceledAt: now,
      refundRequestedAt: now,
      refundStatus,
    });

    return res.status(200).json({
      success: true,
      refundStatus,
      plan: 'free',
      status: 'canceled',
      message:
        refundStatus === 'refunded'
          ? 'Estorno integral realizado com sucesso no Asaas! O valor será devolvido automaticamente no seu Pix ou fatura do cartão, e sua conta voltou para o plano Grátis com todos os seus dados preservados.'
          : 'Sua assinatura foi cancelada e seu pedido de reembolso integral foi registrado! Como o pagamento foi via boleto (ou exige devolução bancária), nossa equipe fará a devolução integral em até 2 dias úteis. Seus dados continuam salvos no plano Grátis.',
    });
  } catch (err: any) {
    const statusCode =
      typeof err?.status === 'number' && err.status >= 400 && err.status < 600
        ? err.status
        : 500;

    console.error('[api/asaas/request-refund] Erro:', {
      status: statusCode,
      message: err?.message || 'Erro interno ao solicitar reembolso',
    });

    return res.status(statusCode).json({
      error:
        err?.message ||
        'Não foi possível processar o reembolso agora. Tente novamente em instantes.',
    });
  }
}
