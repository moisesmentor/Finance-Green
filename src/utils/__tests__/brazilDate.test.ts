import { describe, it, expect } from 'bun:test';
import {
  getSaoPauloNow,
  getSaoPauloCurrentPeriod,
  getSaoPauloTodayString,
  isCurrentMonthSaoPaulo,
  isTodaySaoPaulo,
  getDueDateStatusSaoPaulo,
  getMonthLabelSaoPaulo,
  parseYearMonthFromDateStr,
  BRAZIL_TIMEZONE
} from '../brazilDate';

describe('Brazil Date & Timezone Engine (America/Sao_Paulo)', () => {
  it('identifies America/Sao_Paulo timezone properly', () => {
    expect(BRAZIL_TIMEZONE).toBe('America/Sao_Paulo');
    const now = getSaoPauloNow();
    expect(typeof now.year).toBe('number');
    expect(now.year).toBeGreaterThanOrEqual(2026);
    expect(now.month).toBeGreaterThanOrEqual(0);
    expect(now.month).toBeLessThanOrEqual(11);
    expect(now.day).toBeGreaterThanOrEqual(1);
    expect(now.day).toBeLessThanOrEqual(31);
    expect(now.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  describe('Edge cases: UTC vs Brasil late-night and midnight shifts', () => {
    it('accurately maintains October 31st at 22:00 in Brasil even when UTC has already turned to November 1st (01:00 UTC)', () => {
      // 2026-11-01 01:00:00 UTC = 2026-10-31 22:00:00 BRT (UTC-3)
      const simulatedUtcDate = new Date('2026-11-01T01:00:00Z');
      const sp = getSaoPauloNow(simulatedUtcDate);

      expect(sp.year).toBe(2026);
      expect(sp.month).toBe(9); // 9 = Outubro (0-indexed)
      expect(sp.day).toBe(31);
      expect(sp.hour).toBe(22);
      expect(sp.dateStr).toBe('2026-10-31');
    });

    it('turns to November 1st at 00:01 BRT (03:01 UTC)', () => {
      // 2026-11-01 03:01:00 UTC = 2026-11-01 00:01:00 BRT
      const simulatedUtcDate = new Date('2026-11-01T03:01:00Z');
      const sp = getSaoPauloNow(simulatedUtcDate);

      expect(sp.year).toBe(2026);
      expect(sp.month).toBe(10); // 10 = Novembro (0-indexed)
      expect(sp.day).toBe(1);
      expect(sp.hour).toBe(0);
      expect(sp.minute).toBe(1);
      expect(sp.dateStr).toBe('2026-11-01');
    });

    it('correctly handles New Year turnover (31 Dec 23:59 BRT -> 01 Jan 00:01 BRT)', () => {
      // 2026-12-31 23:59:00 BRT = 2027-01-01 02:59:00 UTC
      const dec31 = new Date('2027-01-01T02:59:00Z');
      const spDec = getSaoPauloNow(dec31);
      expect(spDec.year).toBe(2026);
      expect(spDec.month).toBe(11); // 11 = Dezembro
      expect(spDec.day).toBe(31);
      expect(spDec.dateStr).toBe('2026-12-31');

      // 2027-01-01 00:01:00 BRT = 2027-01-01 03:01:00 UTC
      const jan1 = new Date('2027-01-01T03:01:00Z');
      const spJan = getSaoPauloNow(jan1);
      expect(spJan.year).toBe(2027);
      expect(spJan.month).toBe(0); // 0 = Janeiro
      expect(spJan.day).toBe(1);
      expect(spJan.dateStr).toBe('2027-01-01');
    });
  });

  describe('Period and Month Comparison Helpers', () => {
    it('returns valid current period and today string', () => {
      const period = getSaoPauloCurrentPeriod();
      const todayStr = getSaoPauloTodayString();
      const parts = getSaoPauloNow();

      expect(period.year).toBe(parts.year);
      expect(period.month).toBe(parts.month);
      expect(todayStr).toBe(parts.dateStr);
      expect(isCurrentMonthSaoPaulo(parts.year, parts.month)).toBe(true);
      expect(isCurrentMonthSaoPaulo(parts.year, (parts.month + 1) % 12)).toBe(false);
      expect(isTodaySaoPaulo(todayStr)).toBe(true);
      expect(isTodaySaoPaulo('2020-01-01')).toBe(false);
    });

    it('parses YYYY-MM-DD into { year, month } correctly', () => {
      expect(parseYearMonthFromDateStr('2026-11-15')).toEqual({ year: 2026, month: 10 });
      expect(parseYearMonthFromDateStr('2027-01-05')).toEqual({ year: 2027, month: 0 });
      expect(parseYearMonthFromDateStr('')).toBeNull();
      expect(parseYearMonthFromDateStr('invalid')).toBeNull();
    });

    it('formats month labels in Portuguese', () => {
      expect(getMonthLabelSaoPaulo(2026, 10)).toBe('Novembro de 2026');
      expect(getMonthLabelSaoPaulo(2026, 9)).toBe('Outubro de 2026');
      expect(getMonthLabelSaoPaulo(2027, 0)).toBe('Janeiro de 2027');
    });
  });

  describe('Due Date Status Calculations', () => {
    it('identifies today, tomorrow, upcoming and overdue transactions accurately', () => {
      const today = getSaoPauloTodayString();
      const todayStatus = getDueDateStatusSaoPaulo(today);
      expect(todayStatus.urgency).toBe('today');
      expect(todayStatus.diffDays).toBe(0);
      expect(todayStatus.label).toBe('Vence Hoje');

      // Tomorrow
      const [y, m, d] = today.split('-').map(Number);
      const tomorrowDate = new Date(Date.UTC(y, m - 1, d + 1));
      const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
      const tomorrowStatus = getDueDateStatusSaoPaulo(tomorrowStr);
      expect(tomorrowStatus.urgency).toBe('upcoming');
      expect(tomorrowStatus.diffDays).toBe(1);
      expect(tomorrowStatus.label).toBe('Vence Amanhã');

      // In 3 days
      const in3DaysDate = new Date(Date.UTC(y, m - 1, d + 3));
      const in3DaysStr = in3DaysDate.toISOString().split('T')[0];
      const in3DaysStatus = getDueDateStatusSaoPaulo(in3DaysStr);
      expect(in3DaysStatus.urgency).toBe('upcoming');
      expect(in3DaysStatus.diffDays).toBe(3);
      expect(in3DaysStatus.label).toBe('Vence em 3 dias');

      // Yesterday (1 day late)
      const yesterdayDate = new Date(Date.UTC(y, m - 1, d - 1));
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
      const yesterdayStatus = getDueDateStatusSaoPaulo(yesterdayStr);
      expect(yesterdayStatus.urgency).toBe('overdue');
      expect(yesterdayStatus.diffDays).toBe(-1);
      expect(yesterdayStatus.label).toBe('Atrasada (1 dia)');

      // 5 days late
      const fiveDaysLateDate = new Date(Date.UTC(y, m - 1, d - 5));
      const fiveDaysLateStr = fiveDaysLateDate.toISOString().split('T')[0];
      const fiveDaysLateStatus = getDueDateStatusSaoPaulo(fiveDaysLateStr);
      expect(fiveDaysLateStatus.urgency).toBe('overdue');
      expect(fiveDaysLateStatus.diffDays).toBe(-5);
      expect(fiveDaysLateStatus.label).toBe('Atrasada (5 dias)');
    });
  });
});
