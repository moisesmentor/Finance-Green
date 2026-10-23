import React, { useState, useEffect } from 'react';
import { 
  X, 
  Repeat, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  CalendarOff
} from 'lucide-react';
import { Transaction } from '../types';
import { RecurrenceSeriesInfo, exportTransactionsBackup } from '../utils/recurrence';
import { formatCurrency, formatDateReadable } from '../utils/formatters';

interface RecurrenceScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesInfo: RecurrenceSeriesInfo | null;
  allTransactions: Transaction[];
  onConfirm: (
    scope: 'single' | 'future' | 'all',
    affectedTransactions: Transaction[],
    reason?: string,
    cutMonth?: string
  ) => Promise<void> | void;
  mode?: 'delete' | 'end';
}

export function RecurrenceScopeModal({
  isOpen,
  onClose,
  seriesInfo,
  allTransactions,
  onConfirm,
  mode = 'delete',
}: RecurrenceScopeModalProps) {
  const [selectedScope, setSelectedScope] = useState<'single' | 'future' | 'all'>('future');
  const [confirmPastPaidCheckbox, setConfirmPastPaidCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados dedicados para o modo 'end'
  const [cutMonthOption, setCutMonthOption] = useState<'next' | 'current'>('next');
  const [cancellationReason, setCancellationReason] = useState('');

  // Redefine o estado ao abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedScope('future');
      setConfirmPastPaidCheckbox(false);
      setIsSubmitting(false);
      setCutMonthOption('next');
      setCancellationReason('');
    }
  }, [isOpen, mode]);

  if (!isOpen || !seriesInfo) return null;

  const {
    seriesName,
    targetTx,
    past,
    pastCount,
    pastPaidCount,
    singleCount,
    singleAmount,
    futureCount,
    futureAmount,
    futurePaidCount,
    futurePlusCurrent,
    all,
    allCount,
    allAmount,
    allPaidCount,
    strictlyFuture,
    strictlyFuturePending,
    strictlyFuturePaid,
    futurePending,
  } = seriesInfo;

  const isIncome = targetTx.type === 'income';

  // Lançamentos afetados no modo 'delete'
  const getAffectedDeleteTransactions = (): Transaction[] => {
    if (selectedScope === 'single') {
      return [targetTx];
    }
    if (selectedScope === 'future') {
      return futurePlusCurrent;
    }
    return all;
  };

  // Lançamentos afetados no modo 'end'
  const getAffectedEndTransactions = (): Transaction[] => {
    if (cutMonthOption === 'next') {
      return strictlyFuturePending;
    }
    // A partir deste mês: se o targetTx já estiver pago, preserva-o e remove apenas futuros pendentes
    if (targetTx.status === 'paid') {
      return strictlyFuturePending;
    }
    return futurePending;
  };

  const handleConfirm = async () => {
    if (mode === 'end') {
      try {
        setIsSubmitting(true);
        const affected = getAffectedEndTransactions();
        const cutDate = cutMonthOption === 'next' 
          ? targetTx.date.slice(0, 7) // mês seguinte à referência
          : targetTx.date.slice(0, 7);
        await onConfirm('future', affected, cancellationReason.trim() || undefined, cutDate);
        onClose();
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Modo delete: Se selecionou toda a série e tem lançamentos pagos, exige confirmação
    if (selectedScope === 'all' && allPaidCount > 0 && !confirmPastPaidCheckbox) {
      return;
    }

    try {
      setIsSubmitting(true);
      const affected = getAffectedDeleteTransactions();
      await onConfirm(selectedScope, affected);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadBackup = () => {
    exportTransactionsBackup(
      allTransactions,
      `backup-antes-${mode === 'end' ? 'encerramento' : 'exclusao'}-${seriesName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div 
        className="bg-white dark:bg-[#070707] border border-slate-200 dark:border-white/15 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-colors"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurrence-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 mb-1.5">
              {mode === 'end' ? (
                <>
                  <CalendarOff className="w-3 h-3 text-amber-500" />
                  <span>Encerrar Recorrência</span>
                </>
              ) : (
                <>
                  <Repeat className="w-3 h-3 text-amber-500" />
                  <span>Gerenciar Série Recorrente</span>
                </>
              )}
            </div>

            <h3 
              id="recurrence-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate"
            >
              {mode === 'end' ? 'Encerrar:' : 'Excluir ou Encerrar:'} {seriesName}
            </h3>

            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Mês selecionado: <strong className="text-slate-800 dark:text-zinc-200">{formatDateReadable(targetTx.date)}</strong>
              {targetTx.installmentTotal ? ` • Parcela ${targetTx.installmentCurrent}/${targetTx.installmentTotal}` : ''}
              {` • ${isIncome ? '+' : '-'} ${formatCurrency(targetTx.amount)}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all shrink-0 cursor-pointer min-h-[44px] min-w-[44px]"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ==================================================== */}
        {/* CORPO DO MODAL QUANDO MODE === 'end' (ITEM 3)        */}
        {/* ==================================================== */}
        {mode === 'end' ? (
          <div className="p-4 sm:p-5 space-y-4">
            
            {/* Pergunta: A partir de qual mês encerrar? */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                A partir de qual mês encerrar?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label 
                  onClick={() => setCutMonthOption('next')}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-2.5 min-h-[44px] ${
                    cutMonthOption === 'next'
                      ? 'border-emerald-500 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12]'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="cutMonthOpt" 
                    checked={cutMonthOption === 'next'}
                    onChange={() => setCutMonthOption('next')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500" 
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">A partir do próximo mês</div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                      Padrão (mantém este mês)
                    </div>
                  </div>
                </label>

                <label 
                  onClick={() => setCutMonthOption('current')}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-2.5 min-h-[44px] ${
                    cutMonthOption === 'current'
                      ? 'border-emerald-500 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12]'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a]'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="cutMonthOpt" 
                    checked={cutMonthOption === 'current'}
                    onChange={() => setCutMonthOption('current')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500" 
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Já a partir deste mês</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      Imediato ({formatDateReadable(targetTx.date).split(' de ')[0]})
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Motivo opcional */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Motivo do encerramento <span className="font-normal text-slate-400 dark:text-zinc-500">(opcional, só para seu registro)</span>:
              </label>
              <input 
                type="text" 
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Ex: cliente cancelou contrato, redução de escopo..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500"
              />
            </div>

            {/* Informações de Impacto e Proteção */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0d0d0d] border border-slate-200/80 dark:border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Passados preservados intactos:</span>
                </span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono-num font-bold">
                  {cutMonthOption === 'next' ? pastCount + 1 : pastCount} meses ({formatCurrency((cutMonthOption === 'next' ? pastCount + 1 : pastCount) * targetTx.amount)}) ✓
                </strong>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-white/5 pt-2">
                <span className="text-slate-600 dark:text-zinc-400">Futuros pendentes removidos:</span>
                <strong className="text-amber-600 dark:text-amber-400 font-mono-num font-bold">
                  {cutMonthOption === 'next' ? strictlyFuturePending.length : (targetTx.status === 'paid' ? strictlyFuturePending.length : futurePending.length)} lançamentos
                </strong>
              </div>

              {strictlyFuturePaid.length > 0 && (
                <div className="border-t border-slate-200/60 dark:border-white/5 pt-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{strictlyFuturePaid.length} lançamento(s) futuro(s) já marcado(s) como pago/recebido será(ão) preservado(s).</span>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ==================================================== */
          /* CORPO DO MODAL QUANDO MODE === 'delete' (ITEM 2)     */
          /* ==================================================== */
          <>
            {/* Shield Info: Histórico passado 100% preservado */}
            {pastCount > 0 && (
              <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">
                    Histórico passado: <strong>{pastCount} {pastCount === 1 ? 'mês' : 'meses'}</strong> ({pastPaidCount} {isIncome ? 'recebidos' : 'pagos'})
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md shrink-0">
                  Preservado 100% ✓
                </span>
              </div>
            )}

            {/* Modal Options */}
            <div className="p-4 sm:p-5 space-y-3">
              
              {/* Opção 1: Somente este lançamento */}
              <label 
                onClick={() => setSelectedScope('single')}
                className={`relative flex items-start p-3.5 rounded-2xl border-2 cursor-pointer transition-all min-h-[44px] ${
                  selectedScope === 'single'
                    ? 'border-slate-800 dark:border-white bg-slate-50 dark:bg-[#111111]'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#0a0a0a]'
                }`}
              >
                <input
                  type="radio"
                  name="deleteScope"
                  value="single"
                  checked={selectedScope === 'single'}
                  onChange={() => setSelectedScope('single')}
                  className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-white/20 cursor-pointer"
                />
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      1. Somente este lançamento
                    </span>
                    <span className="text-xs font-mono-num font-semibold text-slate-500 dark:text-zinc-400 shrink-0">
                      {singleCount} mês
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Ex: o cliente atrasou ou teve desconto pontual neste mês. Os próximos meses continuarão ativos.
                  </p>
                  <div className="mt-2 text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Afeta: <strong className="text-slate-900 dark:text-white">{singleCount} lançamento ({formatCurrency(singleAmount)})</strong>
                  </div>
                </div>
              </label>

              {/* Opção 2: Este e os próximos meses (Recomendado) */}
              <label 
                onClick={() => setSelectedScope('future')}
                className={`relative flex items-start p-3.5 rounded-2xl border-2 cursor-pointer transition-all min-h-[44px] ${
                  selectedScope === 'future'
                    ? 'border-emerald-500 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.1]'
                    : 'border-slate-200 dark:border-white/10 hover:border-emerald-500/40 bg-white dark:bg-[#0a0a0a]'
                }`}
              >
                <input
                  type="radio"
                  name="deleteScope"
                  value="future"
                  checked={selectedScope === 'future'}
                  onChange={() => setSelectedScope('future')}
                  className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-white/20 cursor-pointer"
                />
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 flex-wrap">
                      <span>2. Este e os próximos meses</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold px-1.5 py-0.5 rounded-md">
                        Recomendado
                      </span>
                    </span>
                    <span className="text-xs font-mono-num font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {futureCount} meses
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5">
                    <strong>O cliente cancelou:</strong> encerra a recorrência daqui em diante. Todo o histórico passado já recebido permanece 100% intacto nos extratos e relatórios anuais.
                  </p>
                  
                  {futurePaidCount > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Aviso: {futurePaidCount} lançamento futuro já está marcado como pago/recebido.</span>
                    </div>
                  )}

                  <div className="mt-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    Afeta: <strong>{futureCount} lançamentos futuros ({formatCurrency(futureAmount)})</strong>
                  </div>
                </div>
              </label>

              {/* Opção 3: Toda a série, inclusive o histórico (Zona de Perigo) */}
              <label 
                onClick={() => setSelectedScope('all')}
                className={`relative flex items-start p-3.5 rounded-2xl border-2 cursor-pointer transition-all min-h-[44px] ${
                  selectedScope === 'all'
                    ? 'border-rose-500 bg-rose-500/[0.06] dark:bg-rose-500/[0.1]'
                    : 'border-slate-200 dark:border-white/10 hover:border-rose-400/40 bg-white dark:bg-[#0a0a0a]'
                }`}
              >
                <input
                  type="radio"
                  name="deleteScope"
                  value="all"
                  checked={selectedScope === 'all'}
                  onChange={() => setSelectedScope('all')}
                  className="mt-1 w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-white/20 cursor-pointer"
                />
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-rose-600 dark:text-rose-400">
                      3. Toda a série, inclusive o histórico
                    </span>
                    <span className="text-xs font-mono-num font-semibold text-rose-500 shrink-0">
                      {allCount} meses
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    <strong className="text-rose-600 dark:text-rose-400">Atenção:</strong> apaga todos os lançamentos passados e futuros. Irá alterar os totais de meses anteriores.
                  </p>

                  <div className="mt-2 text-[11px] font-semibold text-rose-600/90 dark:text-rose-400">
                    Afeta: <strong>{allCount} lançamentos ({formatCurrency(allAmount)})</strong>
                  </div>
                </div>
              </label>

              {/* Checkbox de segurança caso selecione 'all' e haja lançamentos já pagos */}
              {selectedScope === 'all' && allPaidCount > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2 animate-in fade-in">
                  <label className="flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmPastPaidCheckbox}
                      onChange={e => setConfirmPastPaidCheckbox(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300 dark:border-rose-700 cursor-pointer"
                    />
                    <span>
                      Estou ciente de que <strong>{allPaidCount} lançamentos já pagos/recebidos</strong> no passado serão permanentemente apagados dos meus relatórios.
                    </span>
                  </label>
                </div>
              )}

            </div>
          </>
        )}

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#0a0a0a] border-t border-slate-100 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer py-1"
            title="Baixar cópia de segurança em JSON antes de excluir"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Baixar backup JSON antes</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all min-h-[44px] cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || (mode === 'delete' && selectedScope === 'all' && allPaidCount > 0 && !confirmPastPaidCheckbox)}
              className={`flex-1 sm:flex-initial px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-sm transition-all min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                mode === 'end'
                  ? 'bg-amber-600 hover:bg-amber-500 active:scale-98'
                  : selectedScope === 'all'
                    ? 'bg-rose-600 hover:bg-rose-500 active:scale-98'
                    : selectedScope === 'future'
                      ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-98'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-zinc-200 active:scale-98'
              }`}
            >
              {isSubmitting ? (
                <span>Processando...</span>
              ) : mode === 'end' ? (
                <>
                  <CalendarOff className="w-4 h-4" />
                  <span>Confirmar Encerramento</span>
                </>
              ) : selectedScope === 'all' ? (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Toda a Série</span>
                </>
              ) : selectedScope === 'future' ? (
                <>
                  <CalendarOff className="w-4 h-4" />
                  <span>Encerrar e Excluir Futuros</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Somente Este Mês</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
