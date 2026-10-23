import { Transaction } from '../types';

export interface RecurrenceSeriesInfo {
  isSeries: boolean;
  seriesName: string;
  targetTx: Transaction;
  past: Transaction[];
  current: Transaction;
  future: Transaction[];
  futurePlusCurrent: Transaction[];
  all: Transaction[];
  
  // Counts & Amounts
  singleCount: number;
  singleAmount: number;
  
  futureCount: number;
  futureAmount: number;
  futurePaidCount: number; // Alert if any future is marked paid
  strictlyFuture: Transaction[];
  strictlyFuturePending: Transaction[];
  strictlyFuturePaid: Transaction[];
  futurePending: Transaction[];
  futurePaid: Transaction[];
  
  allCount: number;
  allAmount: number;
  allPaidCount: number;

  pastCount: number;
  pastPaidCount: number;
  pastAmount: number;
}

export interface AuditLogEntry {
  timestamp: number;
  seriesName: string;
  scope: 'single' | 'future' | 'all' | 'ended';
  deletedCount: number;
  deletedIds: string[];
  totalAmount: number;
  reason?: string;
}

const AUDIT_LOG_KEY = 'green_finance_audit_log';

/**
 * Normaliza uma descrição removendo sufixos de parcelas "(1/12)", "( 2 / 12 )", "(1 de 6)",
 * termos recorrentes como "- mensal", pontuações, acentos e espaços extras.
 */
export function normalizeSeriesTitle(description: string): string {
  if (!description) return '';

  return description
    // Remove padrões de parcelamento: (1/12), ( 1 / 12 ), (1 de 12), [1/12]
    .replace(/[\(\[]\s*\d+\s*(?:\/|de)\s*\d+\s*[\)\]]/gi, '')
    // Remove sufixos comuns de contratos recorrentes
    .replace(/\s*-\s*(?:mensal|recorrente|fixo|anual)\b/gi, '')
    // Remove acentuação e diacríticos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Converte para minúsculas
    .toLowerCase()
    // Remove caracteres especiais exceto alfanuméricos e espaços
    .replace(/[^a-z0-9\s]/g, ' ')
    // Normaliza múltiplos espaços para um único
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retorna o nome limpo e legível da série para exibição na UI
 * (ex: "MM - AUREO (2/12)" -> "MM - AUREO")
 */
export function getSeriesCleanDisplayName(description: string): string {
  if (!description) return '';
  const cleaned = description
    .replace(/[\(\[]\s*\d+\s*(?:\/|de)\s*\d+\s*[\)\]]/gi, '')
    .trim();
  return cleaned || description;
}

/**
 * Identifica se um lançamento pertence a uma série (recorrente ou parcelada)
 * e particiona todos os lançamentos daquela série em Passados, Atual e Futuros.
 */
export function findSeriesTransactions(
  targetTx: Transaction,
  allTransactions: Transaction[]
): RecurrenceSeriesInfo {
  const isInstallment = Boolean(
    targetTx.installmentGroupId ||
    (targetTx.installmentTotal && targetTx.installmentTotal > 1) ||
    /[\(\[]\s*\d+\s*(?:\/|de)\s*\d+\s*[\)\]]/i.test(targetTx.description)
  );

  const isMarkedRecurring = Boolean(targetTx.isRecurring || targetTx.recurrenceGroupId);

  const cleanName = getSeriesCleanDisplayName(targetTx.description);
  const targetNorm = normalizeSeriesTitle(targetTx.description);

  // Se não é recorrente nem parcelado, e não tem grupo, é um lançamento único isolado
  if (!isMarkedRecurring && !isInstallment) {
    return {
      isSeries: false,
      seriesName: cleanName,
      targetTx,
      past: [],
      current: targetTx,
      future: [],
      futurePlusCurrent: [targetTx],
      all: [targetTx],
      singleCount: 1,
      singleAmount: targetTx.amount,
      futureCount: 1,
      futureAmount: targetTx.amount,
      futurePaidCount: targetTx.status === 'paid' ? 1 : 0,
      strictlyFuture: [],
      strictlyFuturePending: [],
      strictlyFuturePaid: [],
      futurePending: targetTx.status === 'paid' ? [] : [targetTx],
      futurePaid: targetTx.status === 'paid' ? [targetTx] : [],
      allCount: 1,
      allAmount: targetTx.amount,
      allPaidCount: targetTx.status === 'paid' ? 1 : 0,
      pastCount: 0,
      pastPaidCount: 0,
      pastAmount: 0,
    };
  }

  // Filtrar todos os lançamentos que pertencem a esta mesma série
  const matched = allTransactions.filter(t => {
    // 1. Vínculo por recurrenceGroupId explícito
    if (targetTx.recurrenceGroupId && t.recurrenceGroupId) {
      return t.recurrenceGroupId === targetTx.recurrenceGroupId;
    }

    // 2. Vínculo por installmentGroupId explícito
    if (targetTx.installmentGroupId && t.installmentGroupId) {
      return t.installmentGroupId === targetTx.installmentGroupId;
    }

    // 3. Smart Matching por nome normalizado + tipo de transação (income vs expense)
    if (t.type !== targetTx.type) {
      return false;
    }

    // Se um dos dois for marcado como recorrente ou tiver padrão de série
    const otherNorm = normalizeSeriesTitle(t.description);
    if (!targetNorm || !otherNorm) {
      return false;
    }

    // Compara o nome normalizado da série
    if (otherNorm === targetNorm) {
      // Prioriza mesma categoria se existir
      if (targetTx.categoryId && t.categoryId && targetTx.categoryId === t.categoryId) {
        return true;
      }
      // Se não tiver categoria idêntica mas ambos têm isRecurring ou installment pattern
      if (t.isRecurring || targetTx.isRecurring || /[\(\[]\s*\d+\s*(?:\/|de)\s*\d+\s*[\)\]]/i.test(t.description)) {
        return true;
      }
    }

    return false;
  });

  // Garante que o targetTx está na lista
  if (!matched.some(t => t.id === targetTx.id)) {
    matched.push(targetTx);
  }

  // Ordena a série cronologicamente: data asc -> parcela asc -> createdAt asc
  matched.sort((a, b) => {
    const dateCmp = (a.date || '').localeCompare(b.date || '');
    if (dateCmp !== 0) return dateCmp;
    if (a.installmentCurrent && b.installmentCurrent) {
      return a.installmentCurrent - b.installmentCurrent;
    }
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  // Se encontrou apenas 1 item no total e não tinha grupo explícito
  const isSeries = matched.length > 1 || Boolean(targetTx.installmentGroupId || targetTx.recurrenceGroupId);

  // Particiona em Passado, Atual e Futuro em relação a targetTx
  const past: Transaction[] = [];
  const future: Transaction[] = [];

  const targetDate = targetTx.date;
  const targetCurrentInst = targetTx.installmentCurrent ?? 0;

  for (const t of matched) {
    if (t.id === targetTx.id) {
      continue;
    }

    const tDate = t.date;
    const tCurrentInst = t.installmentCurrent ?? 0;

    // Se temos parcelamento explícito com número de parcela:
    if (targetCurrentInst > 0 && tCurrentInst > 0) {
      if (tCurrentInst < targetCurrentInst) {
        past.push(t);
      } else {
        future.push(t);
      }
    } else {
      // Comparação por data
      if (tDate < targetDate) {
        past.push(t);
      } else if (tDate > targetDate) {
        future.push(t);
      } else {
        // Mesma data: desempate por createdAt ou ordem
        if ((t.createdAt || 0) < (targetTx.createdAt || 0)) {
          past.push(t);
        } else {
          future.push(t);
        }
      }
    }
  }

  const futurePlusCurrent = [targetTx, ...future];

  // Cálculos de contagem e valor
  const singleCount = 1;
  const singleAmount = targetTx.amount;

  const futureCount = futurePlusCurrent.length;
  const futureAmount = futurePlusCurrent.reduce((acc, t) => acc + t.amount, 0);
  const futurePaidCount = futurePlusCurrent.filter(t => t.status === 'paid').length;

  const strictlyFuturePending = future.filter(t => t.status !== 'paid');
  const strictlyFuturePaid = future.filter(t => t.status === 'paid');
  const futurePending = futurePlusCurrent.filter(t => t.status !== 'paid');
  const futurePaid = futurePlusCurrent.filter(t => t.status === 'paid');

  const allCount = matched.length;
  const allAmount = matched.reduce((acc, t) => acc + t.amount, 0);
  const allPaidCount = matched.filter(t => t.status === 'paid').length;

  const pastCount = past.length;
  const pastPaidCount = past.filter(t => t.status === 'paid').length;
  const pastAmount = past.reduce((acc, t) => acc + t.amount, 0);

  return {
    isSeries,
    seriesName: cleanName,
    targetTx,
    past,
    current: targetTx,
    future,
    futurePlusCurrent,
    all: matched,
    singleCount,
    singleAmount,
    futureCount,
    futureAmount,
    futurePaidCount,
    strictlyFuture: future,
    strictlyFuturePending,
    strictlyFuturePaid,
    futurePending,
    futurePaid,
    allCount,
    allAmount,
    allPaidCount,
    pastCount,
    pastPaidCount,
    pastAmount,
  };
}

/**
 * Registra exclusões/encerramento no log local do navegador (audit log)
 */
export function logRecurrenceAudit(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
    logs.unshift({
      ...entry,
      timestamp: Date.now(),
    });
    // Limita aos 100 eventos mais recentes
    if (logs.length > 100) {
      logs.length = 100;
    }
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  } catch (err) {
    console.warn('Falha ao salvar log de auditoria local:', err);
  }
}

/**
 * Exporta um backup instantâneo em formato JSON antes de ações em lote
 */
export function exportTransactionsBackup(transactions: Transaction[], filenamePrefix = 'green-finance-backup'): void {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${filenamePrefix}-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (err) {
    console.error('Erro ao gerar download de backup:', err);
  }
}
