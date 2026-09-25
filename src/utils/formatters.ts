import { MONTH_NAMES } from './constants';

export function formatCurrency(value: number): string {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (isNaN(value)) return '0,00';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export function formatDateReadable(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const monthIndex = parseInt(month, 10) - 1;
    const monthName = MONTH_NAMES[monthIndex] || month;
    return `${parseInt(day, 10)} de ${monthName}`;
  }
  return dateStr;
}

export function getMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} de ${year}`;
}

export function isCurrentMonth(year: number, month: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month;
}

export interface DueDateStatus {
  urgency: 'overdue' | 'today' | 'upcoming' | 'normal';
  diffDays: number;
  label: string;
  badgeClass: string;
}

export function getDueDateStatus(dateStr: string): DueDateStatus {
  if (!dateStr) {
    return {
      urgency: 'normal',
      diffDays: 999,
      label: '',
      badgeClass: '',
    };
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

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
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };
}
