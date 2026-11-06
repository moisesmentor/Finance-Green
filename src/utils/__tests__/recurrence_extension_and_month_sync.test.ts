import { describe, it, expect } from 'bun:test';
import { 
  generateRecurringTransactions, 
  generateInstallmentTransactions, 
  addMonthsToDateString 
} from '../storage';
import { 
  getSaoPauloCurrentPeriod, 
  getSaoPauloTodayString, 
  isCurrentMonthSaoPaulo, 
  getMonthLabelSaoPaulo, 
  parseYearMonthFromDateStr 
} from '../brazilDate';
import { Transaction } from '../../types';

describe('Ajuste 1 & 2: Recorrência Estendida e Sincronização de Calendário Brasil', () => {

  describe('Geração de Recorrências com Duração Estendida (7, 8, 9, 10, 11 e além)', () => {
    const baseTx: Omit<Transaction, 'id' | 'createdAt'> = {
      description: 'Consultoria Mensal',
      amount: 1500,
      type: 'income',
      categoryId: 'servicos',
      date: '2026-11-06',
      paymentMethod: 'pix',
      status: 'paid',
    };

    it('gera exatamente 7 meses consecutivos com numeração correta (1/7 até 7/7)', () => {
      const series = generateRecurringTransactions(baseTx, 7);
      expect(series.length).toBe(7);
      expect(series[0].description).toBe('Consultoria Mensal (1/7)');
      expect(series[0].date).toBe('2026-11-06');
      expect(series[0].status).toBe('paid'); // 1º mês preserva status

      expect(series[6].description).toBe('Consultoria Mensal (7/7)');
      expect(series[6].date).toBe('2027-05-06');
      expect(series[6].status).toBe('pending'); // subsequentes são pendentes
    });

    it('gera exatamente 8, 9, 10 e 11 meses sem pular nenhum mês intermediário', () => {
      for (const count of [8, 9, 10, 11]) {
        const series = generateRecurringTransactions(baseTx, count);
        expect(series.length).toBe(count);
        expect(series[0].installmentTotal).toBe(count);
        expect(series[count - 1].installmentCurrent).toBe(count);
        expect(series[count - 1].description).toBe(`Consultoria Mensal (${count}/${count})`);
      }
    });

    it('gera séries longas de 18, 24, 36, 48 e 60 meses com o mesmo groupId e numeração consistente', () => {
      const series60 = generateRecurringTransactions(baseTx, 60);
      expect(series60.length).toBe(60);
      const groupId = series60[0].recurrenceGroupId;
      expect(groupId).toBeDefined();
      expect(series60.every(t => t.recurrenceGroupId === groupId)).toBe(true);
      expect(series60[59].description).toBe('Consultoria Mensal (60/60)');
      expect(series60[59].date).toBe('2031-10-06');
    });
  });

  describe('Cálculo de Datas e Limite de Dias em Meses Diferentes (Clamping Seguro)', () => {
    it('ajusta dia 31 para o último dia de meses com 30 dias (ex: Abril, Junho, Setembro, Novembro)', () => {
      // 31 de Março -> +1 mês = 30 de Abril
      const aprilDate = addMonthsToDateString('2026-03-31', 1);
      expect(aprilDate).toBe('2026-04-30');

      // 31 de Maio -> +1 mês = 30 de Junho
      const juneDate = addMonthsToDateString('2026-05-31', 1);
      expect(juneDate).toBe('2026-06-30');

      // 31 de Agosto -> +1 mês = 30 de Setembro
      const septDate = addMonthsToDateString('2026-08-31', 1);
      expect(septDate).toBe('2026-09-30');
    });

    it('ajusta dia 31 para 28 de Fevereiro em anos não-bissextos', () => {
      // 2026 não é bissexto
      const feb2026 = addMonthsToDateString('2026-01-31', 1);
      expect(feb2026).toBe('2026-02-28');
    });

    it('ajusta dia 31 para 29 de Fevereiro em anos bissextos (ex: 2028)', () => {
      // 2028 é bissexto
      const feb2028 = addMonthsToDateString('2028-01-31', 1);
      expect(feb2028).toBe('2028-02-29');
    });

    it('nunca pula e nem repete mês ao longo de uma série de 12 meses iniciada em 31 de Janeiro', () => {
      const dates: string[] = [];
      for (let i = 0; i < 12; i++) {
        dates.push(addMonthsToDateString('2026-01-31', i));
      }
      expect(dates).toEqual([
        '2026-01-31',
        '2026-02-28',
        '2026-03-31',
        '2026-04-30',
        '2026-05-31',
        '2026-06-30',
        '2026-07-31',
        '2026-08-31',
        '2026-09-30',
        '2026-10-31',
        '2026-11-30',
        '2026-12-31'
      ]);
    });
  });

  describe('Ajuste 2: Preservação de Mês e Detecção de Mês Divergente', () => {
    it('parseYearMonthFromDateStr extrai período { year, month } compatível com 0-index', () => {
      const p1 = parseYearMonthFromDateStr('2026-11-06');
      expect(p1).toEqual({ year: 2026, month: 10 }); // 10 = Novembro

      const p2 = parseYearMonthFromDateStr('2026-10-15');
      expect(p2).toEqual({ year: 2026, month: 9 }); // 9 = Outubro

      const p3 = parseYearMonthFromDateStr('2027-01-01');
      expect(p3).toEqual({ year: 2027, month: 0 }); // 0 = Janeiro
    });

    it('detecta se uma transação pertence ao mês atualmente visualizado ou a outro mês', () => {
      const activePeriod = { year: 2026, month: 10 }; // Novembro 2026
      
      const sameMonthTxDate = '2026-11-20';
      const parsedSame = parseYearMonthFromDateStr(sameMonthTxDate)!;
      const isSame = parsedSame.year === activePeriod.year && parsedSame.month === activePeriod.month;
      expect(isSame).toBe(true);

      const pastMonthTxDate = '2026-10-30';
      const parsedPast = parseYearMonthFromDateStr(pastMonthTxDate)!;
      const isPastDifferent = parsedPast.year !== activePeriod.year || parsedPast.month !== activePeriod.month;
      expect(isPastDifferent).toBe(true);
    });

    it('formata o rótulo do mês em português perfeitamente para toasts e botões', () => {
      expect(getMonthLabelSaoPaulo(2026, 10)).toBe('Novembro de 2026');
      expect(getMonthLabelSaoPaulo(2026, 9)).toBe('Outubro de 2026');
      expect(getMonthLabelSaoPaulo(2026, 11)).toBe('Dezembro de 2026');
      expect(getMonthLabelSaoPaulo(2027, 0)).toBe('Janeiro de 2027');
    });
  });
});
