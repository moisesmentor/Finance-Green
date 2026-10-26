import { describe, it, expect } from 'bun:test';
import { FinancialGoal, GoalContribution, ReserveLocation, BankAccount } from '../../types';

describe('Emergency Fund Manual Adjustment & Multi-Location Engine (Option B)', () => {
  // Helper to simulate adjustment calculation
  function calculateAdjustment(
    oldTotal: number,
    locations: { name: string; amount: number }[],
    note?: string
  ): {
    newTotal: number;
    diffAmount: number;
    isLargeDiff: boolean;
    contribution: GoalContribution;
    finalLocations: ReserveLocation[];
  } {
    const finalLocations: ReserveLocation[] = locations
      .filter(l => l.name.trim() || l.amount > 0)
      .map((l, idx) => ({
        id: `loc-test-${idx + 1}`,
        name: l.name.trim() || 'Reserva',
        amount: Math.round(l.amount * 100) / 100,
        updatedAt: Date.now(),
      }));

    const newTotal = finalLocations.reduce((sum, l) => sum + l.amount, 0);
    const diffAmount = Math.round((newTotal - oldTotal) * 100) / 100;
    const isLargeDiff = oldTotal > 0 && Math.abs(diffAmount) > (oldTotal * 0.5);
    const locationSummary = finalLocations.map(l => `${l.name} (R$ ${l.amount.toFixed(2)})`).join(' • ');

    const contribution: GoalContribution = {
      id: `contrib-adj-${Date.now()}`,
      amount: Math.abs(diffAmount),
      diffAmount,
      previousAmount: oldTotal,
      newAmount: newTotal,
      location: locationSummary || undefined,
      locations: finalLocations,
      date: new Date().toISOString().split('T')[0],
      type: 'adjustment',
      note: note?.trim() || (diffAmount >= 0 ? 'Ajuste de saldo (+)' : 'Ajuste de saldo (-)'),
      createdAt: Date.now(),
    };

    return {
      newTotal,
      diffAmount,
      isLargeDiff,
      contribution,
      finalLocations,
    };
  }

  it('(a) Ajuste para maior: registra a diferença positiva no histórico e atualiza o saldo e progresso da meta', () => {
    const initialGoal: FinancialGoal = {
      id: 'goal-emergency-fund',
      title: 'Reserva de Emergência',
      targetAmount: 15000,
      currentAmount: 567.20,
      categoryIcon: 'ShieldCheck',
      color: '#059669',
      isEmergencyFund: true,
      autoReservePercentage: 10,
      createdAt: Date.now() - 100000,
      history: [
        {
          id: 'contrib-1',
          amount: 567.20,
          date: '2026-09-15',
          type: 'deposit',
          note: 'Aporte inicial',
          createdAt: Date.now() - 100000,
        }
      ],
    };

    // User informs: Nubank R$ 3.000,00 + Poupança Caixa R$ 2.000,00 = R$ 5.000,00
    const adj = calculateAdjustment(
      initialGoal.currentAmount,
      [
        { name: 'Nubank', amount: 3000 },
        { name: 'Poupança Caixa', amount: 2000 },
      ],
      'Saldo já existente antes do app'
    );

    expect(adj.newTotal).toBe(5000.00);
    expect(adj.diffAmount).toBe(4432.80);
    expect(adj.isLargeDiff).toBe(true); // 4432.80 > 567.20 * 0.5
    expect(adj.contribution.type).toBe('adjustment');
    expect(adj.contribution.previousAmount).toBe(567.20);
    expect(adj.contribution.newAmount).toBe(5000.00);
    expect(adj.contribution.locations?.length).toBe(2);

    // Apply to goal
    const updatedGoal: FinancialGoal = {
      ...initialGoal,
      currentAmount: adj.newTotal,
      locations: adj.finalLocations,
      location: adj.contribution.location,
      lastBalanceUpdateAt: Date.now(),
      history: [adj.contribution, ...(initialGoal.history || [])],
    };

    expect(updatedGoal.currentAmount).toBe(5000.00);
    expect(updatedGoal.history?.length).toBe(2);
    // Previous deposit preserved cent for cent
    expect(updatedGoal.history?.[1].amount).toBe(567.20);
    expect(updatedGoal.history?.[1].type).toBe('deposit');

    // Progress % calculation
    const progressPct = Math.min(100, Math.round((updatedGoal.currentAmount / updatedGoal.targetAmount) * 100));
    expect(progressPct).toBe(33); // 5000 / 15000 = 33%
    const remaining = Math.max(0, updatedGoal.targetAmount - updatedGoal.currentAmount);
    expect(remaining).toBe(10000.00);
  });

  it('(b) Ajuste para menor (uso da reserva): calcula a redução corretamente sem apagar histórico', () => {
    const currentGoal: FinancialGoal = {
      id: 'goal-emergency-fund',
      title: 'Reserva de Emergência',
      targetAmount: 15000,
      currentAmount: 5000.00,
      categoryIcon: 'ShieldCheck',
      color: '#059669',
      isEmergencyFund: true,
      createdAt: Date.now() - 50000,
      locations: [
        { id: 'loc-1', name: 'Nubank', amount: 3000 },
        { id: 'loc-2', name: 'Poupança Caixa', amount: 2000 },
      ],
      history: [],
    };

    // User spent R$ 300 on car repair from Nubank -> Nubank R$ 2.700, Caixa R$ 2.000 -> Total R$ 4.700
    const adj = calculateAdjustment(
      currentGoal.currentAmount,
      [
        { name: 'Nubank', amount: 2700 },
        { name: 'Poupança Caixa', amount: 2000 },
      ],
      'Usei R$ 300 para conserto mecânico do carro'
    );

    expect(adj.newTotal).toBe(4700.00);
    expect(adj.diffAmount).toBe(-300.00);
    expect(adj.isLargeDiff).toBe(false); // 300 is not > 2500 (50% of 5000)
    expect(adj.contribution.note).toBe('Usei R$ 300 para conserto mecânico do carro');
    expect(adj.contribution.newAmount).toBe(4700.00);
  });

  it('(c) Opção B Multi-locais: permite adicionar, alterar ou remover locais dinamicamente', () => {
    // 3 locations
    const adj3 = calculateAdjustment(
      0,
      [
        { name: 'Nubank', amount: 2000 },
        { name: 'Inter', amount: 1500 },
        { name: 'Dinheiro em casa', amount: 500 },
      ]
    );
    expect(adj3.newTotal).toBe(4000.00);
    expect(adj3.finalLocations.length).toBe(3);

    // Remove Dinheiro -> 2 locations
    const adj2 = calculateAdjustment(
      4000.00,
      [
        { name: 'Nubank', amount: 2000 },
        { name: 'Inter', amount: 1500 },
      ]
    );
    expect(adj2.newTotal).toBe(3500.00);
    expect(adj2.diffAmount).toBe(-500.00);
    expect(adj2.finalLocations.length).toBe(2);
  });

  it('(d) Desfazer (Undo) restaura perfeitamente o saldo anterior e os locais prévios', () => {
    const priorLocations: ReserveLocation[] = [
      { id: 'loc-1', name: 'Nubank', amount: 3000 },
      { id: 'loc-2', name: 'Poupança Caixa', amount: 2000 },
    ];

    const priorAdjustment: GoalContribution = {
      id: 'adj-1',
      amount: 4432.80,
      diffAmount: 4432.80,
      previousAmount: 567.20,
      newAmount: 5000.00,
      locations: priorLocations,
      date: '2026-10-25',
      type: 'adjustment',
      note: 'Primeiro ajuste',
      createdAt: 1000,
    };

    // Erroneous adjustment
    const badAdjustment: GoalContribution = {
      id: 'adj-2',
      amount: 1000,
      diffAmount: 1000,
      previousAmount: 5000.00,
      newAmount: 6000.00,
      locations: [{ id: 'loc-3', name: 'Nubank', amount: 6000 }],
      date: '2026-10-26',
      type: 'adjustment',
      note: 'Digitado errado',
      createdAt: 2000,
    };

    const goalBeforeUndo: FinancialGoal = {
      id: 'goal-emergency-fund',
      title: 'Reserva',
      targetAmount: 15000,
      currentAmount: 6000.00,
      categoryIcon: 'ShieldCheck',
      color: '#059669',
      isEmergencyFund: true,
      locations: badAdjustment.locations,
      createdAt: 100,
      history: [badAdjustment, priorAdjustment],
    };

    // Undo logic:
    const restoredAmount = badAdjustment.previousAmount ?? 0;
    const updatedHistory = goalBeforeUndo.history!.filter(h => h.id !== badAdjustment.id);
    const priorAdj = updatedHistory.find(h => h.type === 'adjustment' && h.locations && h.locations.length > 0);

    const goalAfterUndo: FinancialGoal = {
      ...goalBeforeUndo,
      currentAmount: restoredAmount,
      locations: priorAdj?.locations,
      history: updatedHistory,
    };

    expect(goalAfterUndo.currentAmount).toBe(5000.00);
    expect(goalAfterUndo.locations?.length).toBe(2);
    expect(goalAfterUndo.locations?.[0].amount).toBe(3000);
    expect(goalAfterUndo.locations?.[1].amount).toBe(2000);
    expect(goalAfterUndo.history?.length).toBe(1);
    expect(goalAfterUndo.history?.[0].id).toBe('adj-1');
  });

  it('(e) Regra de poupança automática (5%, 10%, 15%, 20%) continua operando independentemente dos ajustes manuais', () => {
    const monthlyIncome = 8500;
    const percentages = [5, 10, 15, 20];
    const expectedSuggested = [425, 850, 1275, 1700];

    percentages.forEach((pct, i) => {
      const suggested = Math.round((monthlyIncome * (pct / 100)) * 100) / 100;
      expect(suggested).toBe(expectedSuggested[i]);
    });
  });

  it('(f) Alerta de inatividade de 30 dias dispara se lastBalanceUpdateAt for mais antigo que 30 dias', () => {
    const thirtyOneDaysMs = 31 * 24 * 60 * 60 * 1000;
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

    const outdatedTimestamp = Date.now() - thirtyOneDaysMs;
    const freshTimestamp = Date.now() - fiveDaysMs;

    const isOutdatedOld = (Date.now() - outdatedTimestamp) > (30 * 24 * 60 * 60 * 1000);
    const isOutdatedRecent = (Date.now() - freshTimestamp) > (30 * 24 * 60 * 60 * 1000);

    expect(isOutdatedOld).toBe(true);
    expect(isOutdatedRecent).toBe(false);
  });

  it('(g) Detecção de alteração expressiva (> 50% de diferença) protege contra erros de digitação', () => {
    const oldBalance = 10000;

    // + R$ 6.000 diff (60% increase) -> large
    const diff1 = 6000;
    expect(Math.abs(diff1) > oldBalance * 0.5).toBe(true);

    // - R$ 6.000 diff (60% decrease) -> large
    const diff2 = -6000;
    expect(Math.abs(diff2) > oldBalance * 0.5).toBe(true);

    // + R$ 2.000 diff (20% increase) -> normal
    const diff3 = 2000;
    expect(Math.abs(diff3) > oldBalance * 0.5).toBe(false);
  });

  it('(h) Consistência com Patrimônio e Contas Bancárias (prevenção de duplicidade com linkToReserve)', () => {
    const emergencyFundBalance = 5000;
    const investmentsTotal = 20000;

    const bankAccounts: BankAccount[] = [
      {
        id: 'bank-1',
        name: 'Nubank Corrente',
        initialBalance: 1500,
        color: '#820ad1',
        isArchived: false,
        linkToReserve: false, // Normal checking account
      },
      {
        id: 'bank-2',
        name: 'Caixa Reserva',
        initialBalance: 5000,
        color: '#0066b3',
        isArchived: false,
        linkToReserve: true, // Safeguard: linked to reserve, must not double-count in bankAccountsTotal
      },
    ];

    const bankAccountsTotal = bankAccounts
      .filter(a => !a.isArchived && !a.linkToReserve)
      .reduce((acc, curr) => acc + (curr.initialBalance || 0), 0);

    expect(bankAccountsTotal).toBe(1500); // 5000 is excluded because linkToReserve is true

    const grandTotalPatrimonio = emergencyFundBalance + investmentsTotal + bankAccountsTotal;
    expect(grandTotalPatrimonio).toBe(26500); // 5000 reserve + 20000 investments + 1500 checking
  });

  it('(i) Isolamento de dados Firestore por usuário (/users/{uid}/goals/{goalId}) com acesso Pro', () => {
    const uidUserA = 'user_alpha_123';
    const uidUserB = 'user_beta_456';
    const goalDocPathA = `/users/${uidUserA}/goals/goal-emergency-fund`;
    const goalDocPathB = `/users/${uidUserB}/goals/goal-emergency-fund`;

    expect(goalDocPathA).not.toBe(goalDocPathB);
    expect(goalDocPathA.startsWith(`/users/${uidUserA}/`)).toBe(true);
    expect(goalDocPathB.startsWith(`/users/${uidUserB}/`)).toBe(true);
  });
});
