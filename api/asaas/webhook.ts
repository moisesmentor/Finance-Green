import crypto from 'crypto';
import {
  getServerUserSubscription,
  isWebhookEventProcessed,
  markWebhookEventProcessed,
  setServerUserSubscription,
} from '../_utils/firebaseAdmin';
import { PaidPlanTier, asaasRequest } from '../_utils/asaas';

/**
 * Comparação em tempo constante para validar o header `asaas-access-token`
 */
function verifyWebhookToken(receivedToken: string | undefined, expectedSecret: string | undefined): boolean {
  if (!receivedToken || !expectedSecret) return false;
  const a = Buffer.from(receivedToken.trim(), 'utf8');
  const b = Buffer.from(expectedSecret.trim(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Extrai uid e plano a partir de um externalReference no formato "${uid}:${plan}" ou "${uid}"
 */
function parseExternalReference(ref?: string | null): {
  uid: string | null;
  plan: PaidPlanTier | null;
} {
  if (!ref || typeof ref !== 'string') {
    return { uid: null, plan: null };
  }
  const trimmed = ref.trim();
  if (!trimmed) return { uid: null, plan: null };

  const [rawUid, rawPlan] = trimmed.split(':');
  const uid = rawUid?.trim() || null;
  const plan =
    rawPlan === 'basic' || rawPlan === 'pro' ? (rawPlan as PaidPlanTier) : null;

  return { uid, plan };
}

/**
 * Calcula o fim do ciclo mensal (+32 dias a partir do vencimento ou da confirmação)
 * e a próxima data de vencimento YYYY-MM-DD
 */
function computeNextMonthlyPeriod(dueDateStr?: string | null): {
  currentPeriodEnd: number;
  nextDueDate: string;
} {
  const now = new Date();
  let baseDate = now;

  if (dueDateStr && /^\d{4}-\d{2}-\d{2}$/.test(dueDateStr)) {
    const parsed = new Date(`${dueDateStr}T12:00:00-03:00`);
    if (!isNaN(parsed.getTime()) && parsed.getTime() > now.getTime()) {
      baseDate = parsed;
    }
  }

  const nextMonth = new Date(baseDate.getTime());
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // Concede 2 dias extras de margem bancária no timestamp de bloqueio
  const currentPeriodEnd = nextMonth.getTime() + 2 * 24 * 60 * 60 * 1000;
  const nextDueDate = nextMonth.toISOString().slice(0, 10);

  return { currentPeriodEnd, nextDueDate };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    // 1. Valida o token de autenticidade do Webhook do Asaas (`asaas-access-token`)
    const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[api/asaas/webhook] ASAAS_WEBHOOK_SECRET não configurado no servidor.');
      return res.status(500).json({ error: 'Webhook não configurado no servidor.' });
    }

    const incomingToken =
      req.headers?.['asaas-access-token'] ||
      req.headers?.['Asaas-Access-Token'] ||
      req.headers?.['x-asaas-access-token'];

    if (!verifyWebhookToken(typeof incomingToken === 'string' ? incomingToken : undefined, webhookSecret)) {
      return res.status(401).json({ error: 'Token de webhook inválido.' });
    }

    // 2. Faz o parse seguro do corpo do evento enviado pelo Asaas
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const eventType = String(payload.event || '').trim();
    const payment = payload.payment || null;
    const subscription = payload.subscription || null;

    if (!eventType) {
      return res.status(400).json({ error: 'Evento ausente no payload.' });
    }

    // 3. Verificação de Idempotência: o mesmo evento recebido duas vezes nunca gera erro nem efeito duplicado
    const objectId = payment?.id || subscription?.id || 'unknown';
    const eventKey = payload.id
      ? String(payload.id)
      : `${eventType}_${objectId}_${payload.dateCreated || ''}`;

    const alreadyProcessed = await isWebhookEventProcessed(eventKey);
    if (alreadyProcessed) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    // 4. Descobre o UID do usuário no Firebase e o plano associado
    let { uid, plan: refPlan } = parseExternalReference(
      payment?.externalReference || subscription?.externalReference
    );

    const asaasSubscriptionId: string | null =
      payment?.subscription || subscription?.id || null;
    const asaasCustomerId: string | null =
      payment?.customer || subscription?.customer || null;

    // Fallback: se o externalReference não veio na cobrança, consulta a assinatura ou o cliente no Asaas
    if (!uid && asaasSubscriptionId) {
      try {
        const subData = await asaasRequest<{ externalReference?: string; customer?: string }>(
          `/subscriptions/${encodeURIComponent(asaasSubscriptionId)}`
        );
        const parsedSub = parseExternalReference(subData?.externalReference);
        uid = parsedSub.uid;
        if (!refPlan) refPlan = parsedSub.plan;
      } catch {
        // segue para o fallback do customer abaixo
      }
    }

    if (!uid && asaasCustomerId) {
      try {
        const custData = await asaasRequest<{ externalReference?: string }>(
          `/customers/${encodeURIComponent(asaasCustomerId)}`
        );
        const parsedCust = parseExternalReference(custData?.externalReference);
        uid = parsedCust.uid;
      } catch {
        // se não encontrar, registra o evento como ignorado com 200 para não travar a fila do Asaas
      }
    }

    if (!uid) {
      await markWebhookEventProcessed(eventKey, {
        eventType,
        userId: null,
        resultStatus: 'ignored_no_uid',
      });
      return res.status(200).json({ received: true, ignored: 'no_user_reference' });
    }

    const existingSub = await getServerUserSubscription(uid);

    // Determina qual plano pago ('basic' ou 'pro') corresponde à assinatura/cobrança
    const valueNum = Number(payment?.value ?? subscription?.value ?? 0);
    const inferredPlanFromValue: PaidPlanTier | null =
      valueNum >= 28 ? 'pro' : valueNum >= 15 ? 'basic' : null;

    const targetPaidPlan: PaidPlanTier =
      refPlan ||
      inferredPlanFromValue ||
      (existingSub?.pendingPlan === 'pro' || existingSub?.pendingPlan === 'basic'
        ? existingSub.pendingPlan
        : existingSub?.plan === 'pro'
        ? 'pro'
        : 'basic');

    const now = Date.now();

    // 5. Tratamento por tipo de evento do Asaas
    switch (eventType) {
      // A) PAGAMENTO CONFIRMADO / RECEBIDO -> Libera o plano (Basic ou Pro) e atualiza ciclo
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_RECEIVED_IN_CASH': {
        const { currentPeriodEnd, nextDueDate } = computeNextMonthlyPeriod(payment?.dueDate);
        const rawBillingType = String(payment?.billingType || '').toUpperCase();
        const paymentMethod =
          rawBillingType === 'CREDIT_CARD' || rawBillingType === 'PIX' || rawBillingType === 'BOLETO'
            ? rawBillingType
            : existingSub?.paymentMethod || 'UNDEFINED';

        await setServerUserSubscription(uid, {
          plan: targetPaidPlan,
          pendingPlan: null,
          status: 'active',
          asaasCustomerId: asaasCustomerId || existingSub?.asaasCustomerId || null,
          asaasSubscriptionId: asaasSubscriptionId || existingSub?.asaasSubscriptionId || null,
          asaasLastPaymentId: payment?.id || existingSub?.asaasLastPaymentId || null,
          billingCycle: 'MONTHLY',
          paymentMethod: paymentMethod as any,
          currentPeriodEnd,
          nextDueDate,
          subscribedAt: existingSub?.subscribedAt || now,
          firstPaymentConfirmedAt: existingSub?.firstPaymentConfirmedAt || now,
          canceledAt: null,
        });

        await markWebhookEventProcessed(eventKey, {
          eventType,
          userId: uid,
          resultStatus: `activated_${targetPaidPlan}`,
        });
        return res.status(200).json({ received: true, status: 'active', plan: targetPaidPlan });
      }

      // B) PAGAMENTO EM ATRASO -> Muda para past_due com tolerância de 3 dias antes de voltar para free
      case 'PAYMENT_OVERDUE': {
        // Se era apenas a primeira cobrança pendente nunca paga, mantém pending;
        // se já era assinante ativo, entra em past_due com 3 dias de tolerância
        const wasActive =
          existingSub?.status === 'active' ||
          existingSub?.status === 'trialing' ||
          existingSub?.status === 'past_due';

        const gracePeriodEnd = wasActive
          ? Math.max(existingSub?.currentPeriodEnd || 0, now + 3 * 24 * 60 * 60 * 1000)
          : null;

        await setServerUserSubscription(uid, {
          plan: wasActive ? existingSub!.plan : 'free',
          status: wasActive ? 'past_due' : 'pending',
          currentPeriodEnd: gracePeriodEnd,
          asaasLastPaymentId: payment?.id || existingSub?.asaasLastPaymentId || null,
        });

        await markWebhookEventProcessed(eventKey, {
          eventType,
          userId: uid,
          resultStatus: wasActive ? 'marked_past_due_with_3d_grace' : 'kept_pending',
        });
        return res.status(200).json({ received: true, status: wasActive ? 'past_due' : 'pending' });
      }

      // C) PAGAMENTO ESTORNADO / REEMBOLSADO / CHARGEBACK -> Volta imediatamente para o plano Grátis (free)
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_REFUND_IN_PROGRESS':
      case 'PAYMENT_CHARGEBACK_REQUESTED': {
        await setServerUserSubscription(uid, {
          plan: 'free',
          pendingPlan: null,
          status: 'canceled',
          currentPeriodEnd: now,
          canceledAt: existingSub?.canceledAt || now,
          refundRequestedAt: existingSub?.refundRequestedAt || now,
          refundStatus: 'refunded',
        });

        await markWebhookEventProcessed(eventKey, {
          eventType,
          userId: uid,
          resultStatus: 'refunded_reverted_to_free',
        });
        return res.status(200).json({ received: true, status: 'canceled', plan: 'free' });
      }

      // D) ASSINATURA CANCELADA / REMOVIDA NO ASAAS -> Mantém acesso até o fim do período já pago e depois volta para free
      case 'SUBSCRIPTION_DELETED':
      case 'SUBSCRIPTION_INACTIVATED': {
        // Ignora caso o evento seja de uma assinatura pendente antiga que já foi substituída por outra
        if (
          existingSub?.asaasSubscriptionId &&
          asaasSubscriptionId &&
          existingSub.asaasSubscriptionId !== asaasSubscriptionId
        ) {
          await markWebhookEventProcessed(eventKey, {
            eventType,
            userId: uid,
            resultStatus: 'ignored_old_subscription',
          });
          return res.status(200).json({ received: true, ignored: 'old_subscription' });
        }

        const hasRemainingPaidTime =
          Boolean(existingSub?.currentPeriodEnd && existingSub.currentPeriodEnd > now) &&
          existingSub?.status !== 'pending';

        await setServerUserSubscription(uid, {
          plan: hasRemainingPaidTime ? existingSub!.plan : 'free',
          pendingPlan: null,
          status: 'canceled',
          canceledAt: existingSub?.canceledAt || now,
        });

        await markWebhookEventProcessed(eventKey, {
          eventType,
          userId: uid,
          resultStatus: hasRemainingPaidTime ? 'canceled_active_until_period_end' : 'canceled_reverted_to_free',
        });
        return res.status(200).json({ received: true, status: 'canceled' });
      }

      // E) COBRANÇA REMOVIDA ENQUANTO AINDA ESTAVA PENDENTE
      case 'PAYMENT_DELETED': {
        if (existingSub?.status === 'pending') {
          await setServerUserSubscription(uid, {
            plan: 'free',
            pendingPlan: null,
            status: 'none',
          });
        }
        await markWebhookEventProcessed(eventKey, {
          eventType,
          userId: uid,
          resultStatus: 'payment_deleted_handled',
        });
        return res.status(200).json({ received: true });
      }

      default: {
        // Eventos informativos do Asaas (ex: PAYMENT_CREATED, PAYMENT_UPDATED) respondem 200 OK
        await markWebhookEventProcessed(eventKey, {
          eventType,
          userId: uid,
          resultStatus: 'acknowledged_noop',
        });
        return res.status(200).json({ received: true });
      }
    }
  } catch (error: any) {
    console.error('[api/asaas/webhook] Erro no processamento do webhook:', error?.message || 'Erro interno');
    return res.status(500).json({ error: 'Erro interno ao processar webhook.' });
  }
}
