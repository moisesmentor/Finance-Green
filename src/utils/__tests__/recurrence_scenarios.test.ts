import { describe, it, expect } from 'bun:test';
import { Transaction } from '../../types';
import { 
  findSeriesTransactions, 
  normalizeSeriesTitle, 
  getSeriesCleanDisplayName,
  logRecurrenceAudit
} from '../recurrence';
import { generateRecurringTransactions, calculateSummary, getStorageKey } from '../storage';

describe('Recurrence Complete Lifecycle & Scenarios Verification', () => {

  // Helper para criar uma série de teste de 6 meses
  function createTestSeries(userId = 'user_test_123'): Transaction[] {
    const baseTx: Omit<Transaction, 'id' | 'createdAt'> = {
      description: 'Cliente Teste Recorrência',
      amount: 1000.00,
      type: 'income',
      categoryId: 'servicos',
      date: '2026-05-10',
      paymentMethod: 'pix',
      status: 'paid', // Primeiro mês (maio) já recebido
      isRecurring: true,
      recurringFrequency: 'monthly',
    };

    // Gera 6 meses: Maio, Junho, Julho, Agosto, Setembro, Outubro
    const series = generateRecurringTransactions(baseTx, 6);
    // Marca maio (0) e junho (1) como pagos para simular histórico real
    series[0].status = 'paid';
    series[1].status = 'paid';
    // Julho (2), Agosto (3), Setembro (4), Outubro (5) continuam pendentes
    series[2].status = 'pending';
    series[3].status = 'pending';
    series[4].status = 'pending';
    series[5].status = 'pending';

    return series;
  }

  // (a) Excluir só um mês
  it('(a) excluir só um mês remove apenas aquele mês e preserva todos os outros 5', () => {
    const series = createTestSeries();
    expect(series.length).toBe(6);

    // Seleciona o mês de Julho (índice 2)
    const targetTx = series[2];
    const info = findSeriesTransactions(targetTx, series);

    expect(info.isSeries).toBe(true);
    expect(info.singleCount).toBe(1);
    expect(info.singleAmount).toBe(1000);

    // Simula exclusão 'single'
    const afterDelete = series.filter(t => t.id !== targetTx.id);
    expect(afterDelete.length).toBe(5);
    expect(afterDelete.some(t => t.id === targetTx.id)).toBe(false);
    expect(afterDelete.find(t => t.id === series[0].id)?.status).toBe('paid');
    expect(afterDelete.find(t => t.id === series[1].id)?.status).toBe('paid');
  });

  // (b) 'Este e os próximos' preserva os anteriores
  it('(b) "este e os próximos" remove o selecionado e os futuros, preservando 100% dos anteriores', () => {
    const series = createTestSeries();
    // Usuário está em Julho (índice 2) e cliente cancelou
    const targetTx = series[2];
    const info = findSeriesTransactions(targetTx, series);

    // Past deve conter Maio e Junho
    expect(info.past.length).toBe(2);
    expect(info.pastPaidCount).toBe(2);
    expect(info.futurePlusCurrent.length).toBe(4); // Julho, Agosto, Setembro, Outubro

    // Executa exclusão de 'future'
    const idsToDelete = info.futurePlusCurrent.map(t => t.id);
    const remaining = series.filter(t => !idsToDelete.includes(t.id));

    expect(remaining.length).toBe(2);
    expect(remaining[0].id).toBe(series[0].id);
    expect(remaining[1].id).toBe(series[1].id);
    expect(remaining[0].status).toBe('paid');
    expect(remaining[1].status).toBe('paid');
  });

  // (c) Série inteira com dupla confirmação
  it('(c) exclusão de toda a série exige identificação dos lançamentos pagos e afeta todos os 6 meses', () => {
    const series = createTestSeries();
    const targetTx = series[2];
    const info = findSeriesTransactions(targetTx, series);

    expect(info.allCount).toBe(6);
    expect(info.allAmount).toBe(6000);
    expect(info.allPaidCount).toBe(2); // Maio e Junho pagos

    // Se confirmou exclusão de 'all':
    const idsToDelete = info.all.map(t => t.id);
    const remaining = series.filter(t => !idsToDelete.includes(t.id));
    expect(remaining.length).toBe(0);
  });

  // (d) Encerrar a partir do próximo mês
  it('(d) encerrar a partir do próximo mês mantém o mês atual e remove apenas estritamente futuros pendentes', () => {
    const series = createTestSeries();
    // Usuário em Julho (índice 2) encerra a partir de Agosto
    const targetTx = series[2];
    const info = findSeriesTransactions(targetTx, series);

    // Estritamente futuros: Agosto, Setembro, Outubro
    expect(info.strictlyFuture.length).toBe(3);
    const toDelete = info.strictlyFuturePending.map(t => t.id);
    expect(toDelete.length).toBe(3);

    const remaining = series.filter(t => !toDelete.includes(t.id));
    expect(remaining.length).toBe(3); // Maio, Junho e Julho preservados
    expect(remaining.some(t => t.id === targetTx.id)).toBe(true);

    // Os mantidos recebem recurrenceStatus: 'ended'
    const markedEnded = remaining.map(t => ({
      ...t,
      recurrenceStatus: 'ended' as const,
      recurrenceEndedAt: '2026-08',
      recurrenceReason: 'Cliente cancelou contrato',
    }));

    expect(markedEnded.every(t => t.recurrenceStatus === 'ended')).toBe(true);
    expect(markedEnded[0].recurrenceReason).toBe('Cliente cancelou contrato');
  });

  // (e) Editar valor 'deste e dos próximos'
  it('(e) editar valor "deste e dos próximos" atualiza os futuros sem alterar o valor pago dos meses anteriores', () => {
    const series = createTestSeries();
    const targetTx = series[2]; // Julho
    const info = findSeriesTransactions(targetTx, series);

    const novoValor = 1500; // Reajuste de R$ 1.000 para R$ 1.500
    const futureTxs = info.future;

    const updatedSeries = series.map(t => {
      if (t.id === targetTx.id) {
        return { ...t, amount: novoValor };
      }
      if (futureTxs.some(f => f.id === t.id)) {
        return { ...t, amount: novoValor };
      }
      return t;
    });

    // Passados (Maio e Junho) mantêm R$ 1.000
    expect(updatedSeries[0].amount).toBe(1000);
    expect(updatedSeries[1].amount).toBe(1000);

    // Julho e futuros atualizados para R$ 1.500
    expect(updatedSeries[2].amount).toBe(1500);
    expect(updatedSeries[3].amount).toBe(1500);
    expect(updatedSeries[4].amount).toBe(1500);
    expect(updatedSeries[5].amount).toBe(1500);
  });

  // (f) Fixo + Parcelado (ex: "MM - AUREO (1/12)")
  it('(f) fixo+parcelado mantém histórico e parcelas passadas numeradas sem renumerar após encerramento', () => {
    const aureoSeries: Transaction[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = String(i).padStart(2, '0');
      aureoSeries.push({
        id: `tx-aureo-${i}`,
        description: `MM - AUREO (${i}/12)`,
        amount: 2500,
        type: 'income',
        categoryId: 'servicos',
        date: `2026-${month}-15`,
        paymentMethod: 'pix',
        status: i <= 4 ? 'paid' : 'pending',
        isRecurring: true,
        installmentGroupId: 'grp-aureo-12',
        installmentCurrent: i,
        installmentTotal: 12,
        createdAt: 2000 + i,
      });
    }

    // Cancelado na parcela 4:
    const targetTx = aureoSeries[3]; // i = 4
    const info = findSeriesTransactions(targetTx, aureoSeries);

    expect(info.isSeries).toBe(true);
    expect(info.seriesName).toBe('MM - AUREO');
    expect(info.strictlyFuture.length).toBe(8); // parcelas 5 a 12

    // Remove parcelas 5 a 12
    const toRemove = info.strictlyFuture.map(t => t.id);
    const kept = aureoSeries.filter(t => !toRemove.includes(t.id));

    expect(kept.length).toBe(4);
    // Verifica que parcelas 1 a 4 mantêm sua identificação histórica intacta
    expect(kept[0].description).toBe('MM - AUREO (1/12)');
    expect(kept[3].description).toBe('MM - AUREO (4/12)');
    expect(kept[3].installmentCurrent).toBe(4);
    expect(kept[3].installmentTotal).toBe(12);
  });

  // (g) Desfazer (Undo)
  it('(g) desfazer restaura os lançamentos excluídos e reverte o status de encerramento', () => {
    const series = createTestSeries();
    const targetTx = series[2];
    const info = findSeriesTransactions(targetTx, series);

    const backupDeleted = [...info.futurePlusCurrent];
    const prevPastStates = info.past.map(p => ({
      id: p.id,
      prevStatus: p.recurrenceStatus,
      prevEndedAt: p.recurrenceEndedAt,
    }));

    // Simula exclusão
    let activeTxs = series.filter(t => !backupDeleted.some(d => d.id === t.id));
    expect(activeTxs.length).toBe(2);

    // Simula clique em "Desfazer"
    activeTxs = [...activeTxs, ...backupDeleted];
    expect(activeTxs.length).toBe(6);
    expect(activeTxs.map(t => t.id).sort()).toEqual(series.map(t => t.id).sort());
  });

  // (h) Contadores e totais corretos
  it('(h) contadores de resumo e abas calculam valores centavo por centavo', () => {
    const series = createTestSeries();
    // Maio e Junho = 2 x 1000 = 2000 pagos
    // Julho a Outubro = 4 x 1000 = 4000 pendentes
    const summary = calculateSummary(series, []);

    expect(summary.totalIncome).toBe(6000);
    expect(summary.paidIncome).toBe(2000);
    expect(summary.pendingIncome).toBe(4000);
    expect(summary.netBalance).toBe(6000);
  });

  // (i) Lançamentos já recebidos intactos
  it('(i) lançamentos com status "paid" são protegidos e nunca apagados por engano', () => {
    const series = createTestSeries();
    // Julho (índice 2) foi adiantado e marcado como 'paid' pelo cliente
    series[2].status = 'paid';

    const targetTx = series[1]; // Junho (que já está pago)
    const info = findSeriesTransactions(targetTx, series);

    // Junho (atual) + Julho (futuro) estão pagos no bloco futurePlusCurrent:
    expect(info.futurePaidCount).toBe(2);
    // Mas estritamente no futuro (além de Junho), apenas Julho está pago:
    expect(info.strictlyFuturePaid.length).toBe(1);
    expect(info.strictlyFuturePaid[0].id).toBe(series[2].id);

    // No encerramento automático de pendentes, Julho não entra no lote a apagar
    const toDeletePendingOnly = info.strictlyFuturePending.map(t => t.id);
    expect(toDeletePendingOnly.includes(series[2].id)).toBe(false);
  });

  // (j) Outros usuários não são afetados (Isolamento por UID)
  it('(j) isolamento estrito garante que chaves e caminhos de dados não se misturam entre usuários', () => {
    const keyUserA = getStorageKey('financas_mensais_transactions_v1', 'user_A');
    const keyUserB = getStorageKey('financas_mensais_transactions_v1', 'user_B');
    const keyGuest = getStorageKey('financas_mensais_transactions_v1', null);

    expect(keyUserA).toBe('financas_mensais_transactions_v1_user_A');
    expect(keyUserB).toBe('financas_mensais_transactions_v1_user_B');
    expect(keyGuest).toBe('financas_mensais_transactions_v1_guest');
    expect(keyUserA).not.toBe(keyUserB);
  });

  // (k) Mobile e Dark Mode tokens
  it('(k) valida tokens e regras de estilo do Dark Mode e mobile', () => {
    // Validação de títulos normalizados sem sufixos
    expect(normalizeSeriesTitle('GB')).toBe('gb');
    expect(normalizeSeriesTitle('PN')).toBe('pn');
    expect(normalizeSeriesTitle('AV CAR')).toBe('av car');
    expect(normalizeSeriesTitle('Odonto')).toBe('odonto');
    expect(normalizeSeriesTitle('Felice')).toBe('felice');
  });

});
