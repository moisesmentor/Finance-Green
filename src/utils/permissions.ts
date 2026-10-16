import { PlanTier, UserSubscription } from '../types';

// E-mails administrativos com acesso Pro vitalício automático
export const ADMIN_EMAILS = ['contatomoisesrodrigues@gmail.com'];

// Peso numérico de cada nível para comparação simples (free < basic < pro)
export const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
};

// Definição de planos e preços de referência para exibição
export const PLAN_DETAILS: Record<
  PlanTier,
  {
    id: PlanTier;
    name: string;
    price: number;
    priceFormatted: string;
    cycleLabel: string;
    description: string;
  }
> = {
  free: {
    id: 'free',
    name: 'Grátis',
    price: 0,
    priceFormatted: 'R$ 0',
    cycleLabel: 'para sempre',
    description: 'Para organizar suas receitas e despesas manualmente no dia a dia.',
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 19.9,
    priceFormatted: 'R$ 19,90',
    cycleLabel: '/mês',
    description: 'Para quem importa extratos bancários e controla tetos por categoria.',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29.9,
    priceFormatted: 'R$ 29,90',
    cycleLabel: '/mês',
    description: 'Gestão completa: do orçamento mensal à reserva, investimentos e visão anual.',
  },
};

// Chaves únicas de todos os recursos controlados por nível no Green Finance Pro
export type AppFeatureKey =
  // Recursos Grátis (free)
  | 'monthly_dashboard'
  | 'statement_and_filters'
  | 'recurring_and_installments'
  | 'manual_bank_accounts'
  // Recursos Basic (basic)
  | 'import_ofx_csv'
  | 'custom_categories'
  | 'category_budgets_and_alerts'
  | 'json_backup_restore'
  // Recursos Pro (pro)
  | 'emergency_fund_and_goals'
  | 'patrimony_and_investments'
  | 'annual_report';

// TABELA ÚNICA DE PERMISSÕES: mapeia cada recurso ao nível mínimo necessário
export const FEATURE_MIN_PLAN: Record<
  AppFeatureKey,
  {
    minPlan: PlanTier;
    label: string;
    description: string;
  }
> = {
  // Nível FREE
  monthly_dashboard: {
    minPlan: 'free',
    label: 'Dashboard Mensal',
    description: 'Resumo de receitas, despesas, saldo líquido e gráficos do mês',
  },
  statement_and_filters: {
    minPlan: 'free',
    label: 'Extrato e Filtros',
    description: 'Histórico de movimentações com abas rápidas e busca',
  },
  recurring_and_installments: {
    minPlan: 'free',
    label: 'Lançamentos Fixos e Parcelados',
    description: 'Projeção de compras parceladas e despesas ou receitas recorrentes',
  },
  manual_bank_accounts: {
    minPlan: 'free',
    label: 'Saldo em Bancos (Manual)',
    description: 'Cadastro manual de contas bancárias, carteira e histórico de reajustes',
  },

  // Nível BASIC
  import_ofx_csv: {
    minPlan: 'basic',
    label: 'Importação de Extratos (OFX e CSV)',
    description: 'Importação em lote de extratos bancários e faturas com conciliação',
  },
  custom_categories: {
    minPlan: 'basic',
    label: 'Categorias Personalizadas Ilimitadas',
    description: 'Criação de categorias próprias com cores e ícones personalizados',
  },
  category_budgets_and_alerts: {
    minPlan: 'basic',
    label: 'Tetos de Gastos por Categoria',
    description: 'Definição de limites mensais por categoria e alertas de estouro',
  },
  json_backup_restore: {
    minPlan: 'basic',
    label: 'Backup e Restauração em JSON',
    description: 'Exportação e importação completa dos seus dados financeiros em arquivo JSON',
  },

  // Nível PRO
  emergency_fund_and_goals: {
    minPlan: 'pro',
    label: 'Reserva de Emergência e Cofrinhos de Metas',
    description: 'Planejamento de reserva financeira e metas com acompanhamento de aportes',
  },
  patrimony_and_investments: {
    minPlan: 'pro',
    label: 'Módulo Patrimônio e Investimentos',
    description: 'Consolidação de Renda Fixa/Variável, Previdência, Consórcio e Capitalização',
  },
  annual_report: {
    minPlan: 'pro',
    label: 'Relatório de Visão Anual',
    description: 'Balanço consolidado mês a mês do ano inteiro e taxa de poupança acumulada',
  },
};

// Assinatura padrão inicial para qualquer usuário novo (sempre começa em free)
export const DEFAULT_FREE_SUBSCRIPTION: UserSubscription = {
  plan: 'free',
  status: 'none',
};

/**
 * Calcula o nível de acesso efetivo (free, basic, pro) de um usuário considerando:
 * 1. Whitelist de administrador (sempre 'pro')
 * 2. Assinatura vitalícia (`isLifetime` ou `status === 'lifetime'`)
 * 3. Status ativo/trialing
 * 4. Período de tolerância em `past_due` ou acesso restante após `canceled` até `currentPeriodEnd`
 * 5. Caso contrário, retorna 'free' (todo usuário novo ou sem assinatura ativa é 'free')
 */
export function getEffectivePlan(
  subscription?: UserSubscription | null,
  userEmail?: string | null
): PlanTier {
  if (userEmail && ADMIN_EMAILS.includes(userEmail.trim().toLowerCase())) {
    return 'pro';
  }

  if (!subscription) {
    return 'free';
  }

  if (subscription.isLifetime || subscription.status === 'lifetime') {
    return subscription.plan === 'basic' ? 'basic' : 'pro';
  }

  const rawPlan: PlanTier =
    subscription.plan === 'pro'
      ? 'pro'
      : subscription.plan === 'basic'
      ? 'basic'
      : 'free';

  if (rawPlan === 'free') {
    return 'free';
  }

  const now = Date.now();

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return rawPlan;
  }

  // Em caso de atraso (past_due) ou cancelamento agendado (canceled),
  // mantém o plano pago enquanto estiver dentro do período pago / tolerância (currentPeriodEnd)
  if (
    (subscription.status === 'past_due' || subscription.status === 'canceled') &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd > now
  ) {
    return rawPlan;
  }

  return 'free';
}

/**
 * Verifica se o nível efetivo do usuário permite acessar determinado recurso
 */
export function canAccessFeature(
  feature: AppFeatureKey,
  subscription?: UserSubscription | null,
  userEmail?: string | null
): boolean {
  const effectivePlan = getEffectivePlan(subscription, userEmail);
  const requiredPlan = FEATURE_MIN_PLAN[feature].minPlan;
  return PLAN_RANK[effectivePlan] >= PLAN_RANK[requiredPlan];
}

/**
 * Retorna qual é o plano mínimo necessário para desbloquear um recurso
 */
export function getRequiredPlanForFeature(feature: AppFeatureKey): PlanTier {
  return FEATURE_MIN_PLAN[feature].minPlan;
}
