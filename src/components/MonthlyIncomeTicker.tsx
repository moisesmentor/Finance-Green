import React, { useState, useMemo } from 'react';
import { 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  Pause, 
  Play, 
  Plus,
  TrendingUp
} from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { MONTH_NAMES } from '../utils/constants';

interface MonthlyIncomeTickerProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onAddNew?: () => void;
  hideValues?: boolean;
}

function formatChipDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parts[2];
    const mIdx = parseInt(parts[1], 10) - 1;
    const mName = MONTH_NAMES[mIdx]?.slice(0, 3) || parts[1];
    return `${day} ${mName}`;
  }
  return dateStr;
}

export const MonthlyIncomeTicker: React.FC<MonthlyIncomeTickerProps> = ({
  transactions,
  onEdit,
  onAddNew,
  hideValues = false,
}) => {
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isHoverOrTouchPaused, setIsHoverOrTouchPaused] = useState(false);

  // Filter and sort incomes of the month by date
  const incomeTransactions = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income')
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  }, [transactions]);

  const totalAmount = useMemo(() => {
    return incomeTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [incomeTransactions]);

  const itemsCount = incomeTransactions.length;
  // If there are more than 2 items, we animate in a continuous loop. If 1 or 2, keep static.
  const shouldAnimate = itemsCount > 2;

  // Dynamic duration: ~7.5 seconds per item, minimum 22s
  const animationDurationSeconds = Math.max(22, itemsCount * 7.5);

  const isPaused = isManuallyPaused || isHoverOrTouchPaused;

  const renderChip = (tx: Transaction, isDuplicate = false) => {
    const isPaid = tx.status === 'paid';

    return (
      <button
        key={isDuplicate ? `dup-${tx.id}` : tx.id}
        type="button"
        onClick={() => onEdit(tx)}
        tabIndex={isDuplicate ? -1 : 0}
        aria-hidden={isDuplicate ? 'true' : undefined}
        title={`Clique para ver ou editar: ${tx.description} (+${formatCurrency(tx.amount)})`}
        aria-label={`Receita ${tx.description}, valor ${formatCurrency(tx.amount)}, data ${formatChipDate(tx.date)}, status ${isPaid ? 'Recebido' : 'A receber'}`}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1e] dark:hover:bg-[#222228] transition-all cursor-pointer shrink-0 active:scale-95 group/chip focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      >
        {/* Status Indicator Icon */}
        <div 
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
            isPaid
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}
        >
          {isPaid ? (
            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <Clock className="w-3.5 h-3.5" />
          )}
        </div>

        {/* Info */}
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[120px] sm:max-w-[150px]">
              {tx.description}
            </span>
            {(tx.isRecurring || tx.recurrenceGroupId) && (
              <span 
                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                title="Receita em Modo Fixo (recorrente)"
              >
                Fixo
              </span>
            )}
            <span 
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                isPaid
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
              }`}
            >
              {isPaid ? 'Recebido' : 'A receber'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
            <span className="font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
              {hideValues ? '••••••' : `+${formatCurrency(tx.amount)}`}
            </span>
            <span>•</span>
            <span className="whitespace-nowrap">{formatChipDate(tx.date)}</span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <section
      id="monthly-income-ticker-strip"
      aria-label="Receitas do Mês"
      className="bg-white dark-brushed-metal rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs dark:shadow-xl p-2.5 sm:p-3 relative overflow-hidden transition-all duration-300"
    >
      <div className="flex items-center gap-2 sm:gap-3.5">
        
        {/* Rótulo Fixo à Esquerda com Total do Mês e Controle de Pausa */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 pl-1 pr-2 sm:pr-3 border-r border-slate-200/80 dark:border-white/10 z-20 bg-white dark:bg-[#151518]">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-xs">
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-zinc-200 tracking-tight whitespace-nowrap">
                Receitas do Mês
              </span>

              {shouldAnimate && (
                <button
                  type="button"
                  onClick={() => setIsManuallyPaused(prev => !prev)}
                  className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title={isManuallyPaused ? 'Continuar rotação automática' : 'Pausar rotação automática'}
                  aria-label={isManuallyPaused ? 'Continuar rotação automática' : 'Pausar rotação automática'}
                >
                  {isManuallyPaused ? (
                    <Play className="w-3 h-3 fill-current" />
                  ) : (
                    <Pause className="w-3 h-3 fill-current" />
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs sm:text-sm font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                {hideValues ? '••••••' : `+${formatCurrency(totalAmount)}`}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 hidden sm:inline whitespace-nowrap">
                ({itemsCount} {itemsCount === 1 ? 'receita' : 'receitas'})
              </span>
            </div>
          </div>
        </div>

        {/* Área Central / Ticker de Chips com Fade Suave */}
        <div
          className="relative flex-1 overflow-x-auto scrollbar-none py-1"
          onMouseEnter={() => setIsHoverOrTouchPaused(true)}
          onMouseLeave={() => setIsHoverOrTouchPaused(false)}
          onTouchStart={() => setIsHoverOrTouchPaused(true)}
          onTouchEnd={() => setIsHoverOrTouchPaused(false)}
        >
          {/* Esmaecimento (Fade) nas laterais */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-[#151518] to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-[#151518] to-transparent z-10" />

          {/* Cenário 1: Sem receitas no mês */}
          {itemsCount === 0 && (
            <div className="flex items-center justify-center sm:justify-start gap-2 py-1 px-3 text-xs text-slate-500 dark:text-zinc-400">
              <Plus className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Nenhuma receita registrada neste mês ainda.</span>
              {onAddNew && (
                <button
                  type="button"
                  onClick={onAddNew}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
                >
                  + Adicionar receita
                </button>
              )}
            </div>
          )}

          {/* Cenário 2: Poucas receitas (1 ou 2) — Parado e alinhado */}
          {itemsCount > 0 && !shouldAnimate && (
            <div className="flex items-center gap-2.5 px-2 overflow-x-auto scrollbar-none">
              {incomeTransactions.map(tx => renderChip(tx, false))}
            </div>
          )}

          {/* Cenário 3: Várias receitas — Loop contínuo com track duplicado */}
          {itemsCount > 0 && shouldAnimate && (
            <div
              className={`animate-ticker flex items-center gap-2.5 ${isPaused ? 'ticker-paused' : ''}`}
              style={{
                '--ticker-duration': `${animationDurationSeconds}s`,
              } as React.CSSProperties}
            >
              {/* Grupo Original */}
              <div className="flex items-center gap-2.5 shrink-0">
                {incomeTransactions.map(tx => renderChip(tx, false))}
              </div>

              {/* Grupo Duplicado para Loop Infinito Contínuo (oculto para leitores de tela) */}
              <div aria-hidden="true" className="flex items-center gap-2.5 shrink-0">
                {incomeTransactions.map(tx => renderChip(tx, true))}
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
