/**
 * Utilitário Centralizado de Data, Hora e Período no Fuso Horário Oficial do Brasil (America/Sao_Paulo)
 * 
 * Garante consistência absoluta de calendário, cálculo de vencimentos e virada de mês,
 * imune a fusos locais do sistema operacional do usuário e sem desvios de UTC tardio (21h-23h59).
 */

import { MonthPeriod } from '../types';
import { MONTH_NAMES } from './constants';

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

export interface SaoPauloDateParts {
  year: number;
  month: number; // 0-indexed (0 = Jan, 10 = Nov, 11 = Dez)
  day: number;
  hour: number;
  minute: number;
  second: number;
  dateStr: string; // Formato padrão YYYY-MM-DD
}

/**
 * Extrai os componentes de data e hora rigorosamente no fuso horário America/Sao_Paulo
 */
export function getSaoPauloNow(input?: Date | number | string): SaoPauloDateParts {
  const dateObj = input 
    ? (input instanceof Date ? input : new Date(input)) 
    : new Date();

  // Se a data for inválida, faz fallback seguro para a data atual
  const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(validDate);

  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);

  const year = get('year');
  const month = get('month') - 1; // 0-indexed para compatibilidade com o ecossistema do app
  const day = get('day');
  const hour = get('hour') % 24;
  const minute = get('minute');
  const second = get('second');
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { year, month, day, hour, minute, second, dateStr };
}

/**
 * Retorna o período { year, month } atual no fuso de Brasília
 */
export function getSaoPauloCurrentPeriod(): MonthPeriod {
  const { year, month } = getSaoPauloNow();
  return { year, month };
}

/**
 * Retorna a string YYYY-MM-DD de hoje no fuso de Brasília
 */
export function getSaoPauloTodayString(): string {
  return getSaoPauloNow().dateStr;
}

/**
 * Verifica se um determinado ano e mês correspondem ao mês atual oficial no Brasil
 */
export function isCurrentMonthSaoPaulo(year: number, month: number): boolean {
  const current = getSaoPauloCurrentPeriod();
  return current.year === year && current.month === month;
}

/**
 * Verifica se uma data YYYY-MM-DD corresponde ao dia de hoje no Brasil
 */
export function isTodaySaoPaulo(dateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr === getSaoPauloTodayString();
}

export interface DueDateStatus {
  urgency: 'overdue' | 'today' | 'upcoming' | 'normal';
  diffDays: number;
  label: string;
  badgeClass: string;
}

/**
 * Calcula o status de vencimento de uma transação com base no calendário civil de Brasília
 * Usa dias civis puros (sem distorções de fuso local, horário de verão ou horas/minutos).
 */
export function getDueDateStatusSaoPaulo(dateStr: string): DueDateStatus {
  if (!dateStr) {
    return {
      urgency: 'normal',
      diffDays: 999,
      label: '',
      badgeClass: '',
    };
  }

  const todayStr = getSaoPauloTodayString();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [y, m, d] = dateStr.split('-').map(Number);

  if (!y || !m || !d) {
    return {
      urgency: 'normal',
      diffDays: 999,
      label: '',
      badgeClass: '',
    };
  }

  // Compara em UTC puro para medir dias inteiros entre duas datas YYYY-MM-DD
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const targetUtc = Date.UTC(y, m - 1, d);
  const diffDays = Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      urgency: 'overdue',
      diffDays,
      label: daysLate === 1 ? 'Atrasada (1 dia)' : `Atrasada (${daysLate} dias)`,
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    };
  }

  if (diffDays === 0) {
    return {
      urgency: 'today',
      diffDays: 0,
      label: 'Vence Hoje',
      badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 animate-pulse',
    };
  }

  if (diffDays === 1) {
    return {
      urgency: 'upcoming',
      diffDays: 1,
      label: 'Vence Amanhã',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    };
  }

  if (diffDays <= 3) {
    return {
      urgency: 'upcoming',
      diffDays,
      label: `Vence em ${diffDays} dias`,
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    };
  }

  return {
    urgency: 'normal',
    diffDays,
    label: `Vence em ${diffDays} dias`,
    badgeClass: 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-white/10',
  };
}

/**
 * Retorna o rótulo do mês por extenso (ex: "Novembro de 2026")
 */
export function getMonthLabelSaoPaulo(year: number, month: number): string {
  const monthName = MONTH_NAMES[month] || `Mês ${month + 1}`;
  return `${monthName} de ${year}`;
}

/**
 * Extrai { year, month } a partir de uma data no formato YYYY-MM-DD
 */
export function parseYearMonthFromDateStr(dateStr: string): MonthPeriod | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length < 2) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  if (isNaN(year) || isNaN(month)) return null;
  return { year, month };
}
