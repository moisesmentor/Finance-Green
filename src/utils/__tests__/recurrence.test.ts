import { describe, it, expect } from 'bun:test';
import { Transaction } from '../../types';
import { 
  normalizeSeriesTitle, 
  getSeriesCleanDisplayName, 
  findSeriesTransactions 
} from '../recurrence';

describe('Recurrence & Series Engine', () => {

  describe('normalizeSeriesTitle', () => {
    it('normalizes installment suffixes like (2/12), ( 2 / 12 ) and (2 de 12)', () => {
      expect(normalizeSeriesTitle('MM - AUREO (2/12)')).toBe('mm aureo');
      expect(normalizeSeriesTitle('MM - AUREO ( 2 / 12 )')).toBe('mm aureo');
      expect(normalizeSeriesTitle('MM - AUREO (2 de 12)')).toBe('mm aureo');
    });

    it('normalizes case, accents and recurring suffixes (GB, gb, GB - Mensal)', () => {
      expect(normalizeSeriesTitle('GB')).toBe('gb');
      expect(normalizeSeriesTitle('gb')).toBe('gb');
      expect(normalizeSeriesTitle('GB - Mensal')).toBe('gb');
      expect(normalizeSeriesTitle('GB - Recorrente')).toBe('gb');
      expect(normalizeSeriesTitle('Cliente Áureo')).toBe('cliente aureo');
    });
  });

  describe('getSeriesCleanDisplayName', () => {
    it('strips installment counters for clean UI display', () => {
      expect(getSeriesCleanDisplayName('MM - AUREO (2/12)')).toBe('MM - AUREO');
      expect(getSeriesCleanDisplayName('GB')).toBe('GB');
    });
  });

  describe('findSeriesTransactions: Special Cases', () => {
    
    // CASO 1: Lançamento Fixo E Parcelado ao mesmo tempo ("MM - AUREO (2/12)")
    it('handles fixed and installment series at the same time and protects past received', () => {
      const allTxs: Transaction[] = [];
      const groupId = 'group-aureo';

      // 12 parcelas
      for (let i = 1; i <= 12; i++) {
        const month = String(i).padStart(2, '0');
        allTxs.push({
          id: `tx-aureo-${i}`,
          description: `MM - AUREO (${i}/12)`,
          amount: 2500,
          type: 'income',
          categoryId: 'services',
          date: `2026-${month}-15`,
          paymentMethod: 'pix',
          status: i === 1 ? 'paid' : 'pending',
          isRecurring: true,
          installmentGroupId: groupId,
          installmentCurrent: i,
          installmentTotal: 12,
          createdAt: 1000 + i,
        });
      }

      // Usuário está na parcela 2 e clica para excluir / encerrar
      const targetTx = allTxs[1]; // i = 2
      const result = findSeriesTransactions(targetTx, allTxs);

      expect(result.isSeries).toBe(true);
      expect(result.seriesName).toBe('MM - AUREO');
      expect(result.past.length).toBe(1); // Parcela 1
      expect(result.past[0].installmentCurrent).toBe(1);
      expect(result.pastPaidCount).toBe(1); // Parcela 1 já recebida!

      expect(result.current.id).toBe('tx-aureo-2');
      expect(result.future.length).toBe(10); // Parcelas 3 a 12
      expect(result.futurePlusCurrent.length).toBe(11); // Parcelas 2 a 12
      expect(result.futureAmount).toBe(11 * 2500); // R$ 27.500

      // Se o usuário aplicar a opção "future" (este e os próximos):
      const idsToDelete = result.futurePlusCurrent.map(t => t.id);
      const remaining = allTxs.filter(t => !idsToDelete.includes(t.id));

      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('tx-aureo-1');
      expect(remaining[0].status).toBe('paid');
    });

    // CASO 2: Recorrência com valor que variou (reajuste de preço)
    it('links series even when monthly amount changed due to price adjustments', () => {
      const txs: Transaction[] = [
        {
          id: 'gb-1',
          description: 'GB',
          amount: 1500,
          type: 'income',
          categoryId: 'contract',
          date: '2026-08-10',
          paymentMethod: 'transfer',
          status: 'paid',
          isRecurring: true,
          createdAt: 1,
        },
        {
          id: 'gb-2',
          description: 'GB',
          amount: 1500,
          type: 'income',
          categoryId: 'contract',
          date: '2026-09-10',
          paymentMethod: 'transfer',
          status: 'paid',
          isRecurring: true,
          createdAt: 2,
        },
        {
          id: 'gb-3',
          description: 'GB',
          amount: 1800, // Reajuste de valor!
          type: 'income',
          categoryId: 'contract',
          date: '2026-10-10',
          paymentMethod: 'transfer',
          status: 'pending',
          isRecurring: true,
          createdAt: 3,
        },
        {
          id: 'gb-4',
          description: 'GB',
          amount: 1800,
          type: 'income',
          categoryId: 'contract',
          date: '2026-11-10',
          paymentMethod: 'transfer',
          status: 'pending',
          isRecurring: true,
          createdAt: 4,
        },
      ];

      const currentTx = txs[2]; // Outubro
      const result = findSeriesTransactions(currentTx, txs);

      expect(result.isSeries).toBe(true);
      expect(result.all.length).toBe(4);
      expect(result.past.length).toBe(2); // Agosto e Setembro
      expect(result.pastPaidCount).toBe(2);
      expect(result.futurePlusCurrent.length).toBe(2); // Outubro e Novembro
    });

    // CASO 3: Variações de digitação (acentos, maiúsculas, sufixos)
    it('matches series across typing variations (GB, gb, GB - Mensal)', () => {
      const txs: Transaction[] = [
        {
          id: '1',
          description: 'GB',
          amount: 1200,
          type: 'income',
          categoryId: 'c1',
          date: '2026-01-01',
          paymentMethod: 'pix',
          status: 'paid',
          isRecurring: true,
          createdAt: 1,
        },
        {
          id: '2',
          description: 'gb',
          amount: 1200,
          type: 'income',
          categoryId: 'c1',
          date: '2026-02-01',
          paymentMethod: 'pix',
          status: 'paid',
          isRecurring: true,
          createdAt: 2,
        },
        {
          id: '3',
          description: 'GB - Mensal',
          amount: 1200,
          type: 'income',
          categoryId: 'c1',
          date: '2026-03-01',
          paymentMethod: 'pix',
          status: 'pending',
          isRecurring: true,
          createdAt: 3,
        },
      ];

      const target = txs[1]; // 'gb'
      const result = findSeriesTransactions(target, txs);

      expect(result.isSeries).toBe(true);
      expect(result.all.length).toBe(3);
    });

    // CASO 4: Não alterar histórico em relatórios de meses anteriores
    it('preserves past month totals cent for cent when future recurrence is ended', () => {
      const historicalMonth = '2026-08';
      const txs: Transaction[] = [
        {
          id: 'past-1',
          description: 'AV CAR',
          amount: 1500,
          type: 'income',
          categoryId: 'c1',
          date: '2026-08-10',
          paymentMethod: 'pix',
          status: 'paid',
          isRecurring: true,
          createdAt: 1,
        },
        {
          id: 'past-2',
          description: 'Supermercado',
          amount: 450.50,
          type: 'expense',
          categoryId: 'groceries',
          date: '2026-08-12',
          paymentMethod: 'credit_card',
          status: 'paid',
          createdAt: 2,
        },
        {
          id: 'future-1',
          description: 'AV CAR',
          amount: 1500,
          type: 'income',
          categoryId: 'c1',
          date: '2026-10-10',
          paymentMethod: 'pix',
          status: 'pending',
          isRecurring: true,
          createdAt: 3,
        },
      ];

      // Total histórico antes da exclusão de AV CAR em Outubro
      const pastTotalBefore = txs
        .filter(t => t.date.startsWith(historicalMonth))
        .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

      // Usuário exclui AV CAR a partir de Outubro
      const target = txs[2];
      const series = findSeriesTransactions(target, txs);
      const toDeleteIds = series.futurePlusCurrent.map(t => t.id);
      const remainingTxs = txs.filter(t => !toDeleteIds.includes(t.id));

      // Total histórico depois da exclusão
      const pastTotalAfter = remainingTxs
        .filter(t => t.date.startsWith(historicalMonth))
        .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

      expect(pastTotalAfter).toBe(pastTotalBefore);
      expect(pastTotalAfter).toBe(1500 - 450.50);
    });

  });

});
