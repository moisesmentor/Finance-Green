import { verifyFirebaseUser } from '../_utils/auth';
import {
  getServerUserSubscription,
  setServerUserSubscription,
} from '../_utils/firebaseAdmin';
import {
  ASAAS_PLAN_CONFIG,
  PaidPlanTier,
  asaasRequest,
} from '../_utils/asaas';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    // 1. Valida o token Firebase Auth do usuário
    const authUser = await verifyFirebaseUser(req);
    if (!authUser?.uid) {
      return res.status(401).json({
        error: 'Não autorizado. Faça login novamente para continuar.',
      });
    }

    // 2. Valida o novo plano desejado ('basic' ou 'pro')
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const rawTarget = String(body.targetPlan || body.plan || '').trim().toLowerCase();
    if (rawTarget !== 'basic' && rawTarget !== 'pro') {
      return res.status(400).json({
        error: 'Plano inválido. Escolha entre Basic ou Pro.',
      });
    }
    const targetPlan: PaidPlanTier = rawTarget;
    const planConfig = ASAAS_PLAN_CONFIG[targetPlan];

    // 3. Carrega a assinatura atual do usuário no Firestore via Admin SDK
    const existingSub = await getServerUserSubscription(authUser.uid);

    if (
      !existingSub ||
      !existingSub.asaasSubscriptionId ||
      (existingSub.status !== 'active' && existingSub.status !== 'trialing')
    ) {
      return res.status(400).json({
        error: 'Você não possui uma assinatura ativa para alterar. Utilize o fluxo de nova assinatura.',
        requiresNewSubscription: true,
      });
    }

    if (existingSub.plan === targetPlan && !existingSub.pendingPlan) {
      return res.status(409).json({
        error: `Sua assinatura já está no plano ${planConfig.name}.`,
      });
    }

    // 4. Atualiza a assinatura existente no Asaas (PUT /v3/subscriptions/{id})
    // Sem criar outra assinatura paralela, evitando cobrança em duplicidade
    await asaasRequest(
      `/subscriptions/${encodeURIComponent(existingSub.asaasSubscriptionId)}`,
      {
        method: 'PUT',
        body: {
          value: planConfig.value,
          description: planConfig.description,
          externalReference: `${authUser.uid}:${targetPlan}`,
          updatePendingPayments: true,
        },
      }
    );

    // 5. Regra de Upgrade vs Downgrade:
    // a) Upgrade (Basic -> Pro, ou cancelando downgrade agendado Pro -> Basic):
    //    Libera o plano Pro imediatamente e atualiza as próximas cobranças para R$ 29,90
    if (targetPlan === 'pro') {
      await setServerUserSubscription(authUser.uid, {
        plan: 'pro',
        pendingPlan: null,
        status: 'active',
      });

      return res.status(200).json({
        success: true,
        mode: 'upgrade',
        plan: 'pro',
        pendingPlan: null,
        message: 'Upgrade realizado com sucesso! Todos os recursos do plano Pro já estão liberados.',
      });
    }

    // b) Downgrade (Pro -> Basic):
    //    Mantém o plano Pro ativo até o fim do período já pago (`currentPeriodEnd`)
    //    e agenda `pendingPlan: 'basic'` para entrar em vigor no próximo ciclo (R$ 19,90/mês)
    await setServerUserSubscription(authUser.uid, {
      plan: 'pro',
      pendingPlan: 'basic',
      status: 'active',
    });

    return res.status(200).json({
      success: true,
      mode: 'downgrade',
      plan: 'pro',
      pendingPlan: 'basic',
      currentPeriodEnd: existingSub.currentPeriodEnd || null,
      nextDueDate: existingSub.nextDueDate || null,
      message:
        'Mudança para o plano Basic agendada para o próximo ciclo! Seu acesso Pro continua ativo até o fim do período já pago.',
    });
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const safeMessage =
      statusCode >= 400 && statusCode < 500
        ? error.message
        : error?.message || 'Não foi possível alterar o plano da assinatura no momento.';
    console.error('[api/asaas/change-plan] Erro ao alterar plano:', safeMessage);
    return res.status(statusCode).json({ error: safeMessage });
  }
}
