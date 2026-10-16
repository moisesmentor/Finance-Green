import { verifyFirebaseUser } from '../_utils/auth';
import {
  getServerUserSubscription,
  setServerUserSubscription,
} from '../_utils/firebaseAdmin';
import {
  ASAAS_PLAN_CONFIG,
  PaidPlanTier,
  asaasRequest,
  getTodayDateStrBrazil,
  isValidCpfCnpj,
  sanitizeCpfCnpj,
} from '../_utils/asaas';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    // 1. Autentica o usuário pelo token Firebase Auth (Bearer <idToken>)
    const authUser = await verifyFirebaseUser(req);
    if (!authUser?.uid) {
      return res.status(401).json({
        error: 'Não autorizado. Faça login novamente para continuar.',
      });
    }

    // 2. Valida os parâmetros enviados pelo cliente
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const rawPlan = String(body.plan || '').trim().toLowerCase();
    if (rawPlan !== 'basic' && rawPlan !== 'pro') {
      return res.status(400).json({
        error: 'Plano inválido. Escolha entre Basic ou Pro.',
      });
    }
    const chosenPlan: PaidPlanTier = rawPlan;
    const planConfig = ASAAS_PLAN_CONFIG[chosenPlan];

    const cpfCnpjDigits = sanitizeCpfCnpj(body.cpfCnpj || '');
    if (!isValidCpfCnpj(cpfCnpjDigits)) {
      return res.status(400).json({
        error: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para emissão da cobrança.',
      });
    }

    const customerName =
      String(body.name || authUser.displayName || authUser.email?.split('@')[0] || 'Cliente Green Finance')
        .trim()
        .slice(0, 100);

    // 3. Consulta o estado atual da assinatura no Firestore via Admin SDK
    const existingSub = await getServerUserSubscription(authUser.uid);

    // Se já estiver com o mesmo plano ativo, bloqueia criação duplicada
    if (
      existingSub &&
      (existingSub.status === 'active' || existingSub.status === 'lifetime' || existingSub.isLifetime) &&
      existingSub.plan === chosenPlan
    ) {
      return res.status(409).json({
        error: `Você já possui o plano ${planConfig.name} ativo na sua conta.`,
        alreadyActive: true,
      });
    }

    // Se já existir uma assinatura pendente para o MESMO plano com link de pagamento aberto no Asaas,
    // verifica se a cobrança ainda está pendente para reaproveitar o mesmo checkout sem duplicar
    if (
      existingSub &&
      existingSub.status === 'pending' &&
      (existingSub.pendingPlan === chosenPlan || existingSub.plan === chosenPlan) &&
      existingSub.asaasSubscriptionId
    ) {
      try {
        const paymentsResp = await asaasRequest<{ data?: Array<{ id: string; status: string; invoiceUrl?: string }> }>(
          `/subscriptions/${encodeURIComponent(existingSub.asaasSubscriptionId)}/payments`
        );
        const pendingPayment = paymentsResp?.data?.find(
          (p) => (p.status === 'PENDING' || p.status === 'OVERDUE') && p.invoiceUrl
        );
        if (pendingPayment?.invoiceUrl) {
          return res.status(200).json({
            checkoutUrl: pendingPayment.invoiceUrl,
            subscriptionId: existingSub.asaasSubscriptionId,
            plan: chosenPlan,
            reused: true,
          });
        }
      } catch {
        // Caso a assinatura anterior não exista mais no Asaas, segue criando uma nova abaixo
      }
    }

    // 4. Localiza ou cria o cliente no Asaas (/v3/customers)
    let asaasCustomerId: string | null = existingSub?.asaasCustomerId || null;

    if (asaasCustomerId) {
      try {
        const existingCustomer = await asaasRequest<{ id: string; deleted?: boolean; cpfCnpj?: string }>(
          `/customers/${encodeURIComponent(asaasCustomerId)}`
        );
        if (!existingCustomer?.id || existingCustomer.deleted) {
          asaasCustomerId = null;
        } else if (existingCustomer.cpfCnpj !== cpfCnpjDigits) {
          // Atualiza o CPF/CNPJ no cadastro do cliente no Asaas caso estivesse vazio ou diferente
          await asaasRequest(`/customers/${encodeURIComponent(asaasCustomerId)}`, {
            method: 'POST',
            body: {
              name: customerName,
              cpfCnpj: cpfCnpjDigits,
              externalReference: authUser.uid,
            },
          });
        }
      } catch {
        asaasCustomerId = null;
      }
    }

    if (!asaasCustomerId) {
      // Busca por externalReference (uid do Firebase) para evitar duplicar o cliente no Asaas
      const searchByRef = await asaasRequest<{ data?: Array<{ id: string; deleted?: boolean }> }>(
        `/customers?externalReference=${encodeURIComponent(authUser.uid)}`
      );
      const foundCustomer = searchByRef?.data?.find((c) => c.id && !c.deleted);

      if (foundCustomer?.id) {
        asaasCustomerId = foundCustomer.id;
        await asaasRequest(`/customers/${encodeURIComponent(asaasCustomerId)}`, {
          method: 'POST',
          body: {
            name: customerName,
            email: authUser.email || undefined,
            cpfCnpj: cpfCnpjDigits,
            externalReference: authUser.uid,
          },
        });
      } else {
        // Cria novo cliente no Asaas
        const createdCustomer = await asaasRequest<{ id: string }>('/customers', {
          method: 'POST',
          body: {
            name: customerName,
            email: authUser.email || undefined,
            cpfCnpj: cpfCnpjDigits,
            externalReference: authUser.uid,
          },
        });
        asaasCustomerId = createdCustomer.id;
      }
    }

    // 5. Se havia uma assinatura pendente anterior (ex: trocou de Basic para Pro antes de pagar),
    // remove a assinatura pendente antiga no Asaas para não deixar cobrança órfã
    if (
      existingSub?.status === 'pending' &&
      existingSub.asaasSubscriptionId &&
      existingSub.asaasSubscriptionId !== ''
    ) {
      try {
        await asaasRequest(`/subscriptions/${encodeURIComponent(existingSub.asaasSubscriptionId)}`, {
          method: 'DELETE',
        });
      } catch {
        // Ignora se já tiver sido removida no Asaas
      }
    }

    // 6. Cria a assinatura mensal no Asaas (/v3/subscriptions)
    // billingType: 'UNDEFINED' permite que no Checkout Hospedado do Asaas o cliente escolha Cartão, Pix ou Boleto
    const nextDueDate = getTodayDateStrBrazil();
    const createdSubscription = await asaasRequest<{
      id: string;
      status: string;
      nextDueDate: string;
      cycle: string;
    }>('/subscriptions', {
      method: 'POST',
      body: {
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        value: planConfig.value,
        nextDueDate,
        cycle: 'MONTHLY',
        description: planConfig.description,
        externalReference: `${authUser.uid}:${chosenPlan}`,
      },
    });

    // 7. Consulta a primeira cobrança gerada pela assinatura (/v3/subscriptions/{id}/payments)
    // para obter o link oficial do Checkout Hospedado do Asaas (invoiceUrl)
    const paymentsList = await asaasRequest<{
      data?: Array<{
        id: string;
        invoiceUrl?: string;
        bankSlipUrl?: string;
        dueDate?: string;
      }>;
    }>(`/subscriptions/${encodeURIComponent(createdSubscription.id)}/payments`);

    const firstPayment = paymentsList?.data?.[0];
    const checkoutUrl = firstPayment?.invoiceUrl;

    if (!checkoutUrl) {
      return res.status(502).json({
        error: 'A assinatura foi criada, mas não foi possível obter o link de pagamento do Asaas.',
      });
    }

    // 8. Salva o estado pendente no Firestore usando exclusivamente o Admin SDK
    // O plano efetivo permanece 'free' até que o webhook confirme o pagamento (Etapa 4)
    const currentActivePlan =
      existingSub && (existingSub.status === 'active' || existingSub.status === 'trialing')
        ? existingSub.plan
        : 'free';

    await setServerUserSubscription(authUser.uid, {
      plan: currentActivePlan,
      pendingPlan: chosenPlan,
      status:
        existingSub && (existingSub.status === 'active' || existingSub.status === 'trialing')
          ? existingSub.status
          : 'pending',
      asaasCustomerId,
      asaasSubscriptionId: createdSubscription.id,
      asaasCheckoutUrl: checkoutUrl,
      asaasLastPaymentId: firstPayment?.id || null,
      billingCycle: 'MONTHLY',
      nextDueDate: createdSubscription.nextDueDate || nextDueDate,
      customerEmail: authUser.email || null,
    });

    return res.status(200).json({
      checkoutUrl,
      subscriptionId: createdSubscription.id,
      paymentId: firstPayment?.id || null,
      plan: chosenPlan,
    });
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const safeMessage =
      statusCode >= 400 && statusCode < 500
        ? error.message
        : error?.message || 'Não foi possível iniciar o checkout da assinatura no momento.';
    console.error('[api/asaas/create-subscription] Erro ao criar assinatura:', safeMessage);
    return res.status(statusCode).json({ error: safeMessage });
  }
}
