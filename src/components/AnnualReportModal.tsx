import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import { Transaction, AnnualSummary } from '../types';
import { calculateAnnualSummary, exportTransactionsToCSV } from '../utils/storage';
import { formatCurrency } from '../utils/formatters';
import { MONTH_NAMES } from '../utils/constants';

interface AnnualReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currentYear: number;
}

export const AnnualReportModal: React.FC<AnnualReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  currentYear,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const annualSummary: AnnualSummary = useMemo(() => {
    return calculateAnnualSummary(transactions, selectedYear);
  }, [transactions, selectedYear]);

  if (!isOpen) return null;

  // Maximum value for chart scaling
  const maxMonthValue = Math.max(
    ...annualSummary.months.map(m => Math.max(m.income, m.expense)),
    100
  );

  const handleExportCSV = () => {
    const yearTransactions = transactions.filter(
      t => t.date && t.date.startsWith(`${selectedYear}-`)
    );
    const csvContent = exportTransactionsToCSV(yearTransactions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financas_anual_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-annual-report"
        className="bg-white dark-brushed-metal-modal rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Relatório & Visão Anual ({selectedYear})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhe o balanço acumulado, histórico mensal e exporte relatórios
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Year Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-black/50 rounded-lg p-0.5 border border-slate-200 dark:border-white/10">
              <button
                onClick={() => setSelectedYear(prev => prev - 1)}
                className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Ano anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 font-mono-num">
                {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear(prev => prev + 1)}
                className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Próximo ano"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Action buttons (Export to Excel & PDF) */}
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel / CSV
              </button>
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir / Salvar PDF
              </button>
            </div>

            {downloadSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Planilha baixada com sucesso!
              </span>
            )}
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 dark-subcard rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Receitas do Ano
              </span>
              <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono-num dark-text-glow-emerald">
                {formatCurrency(annualSummary.totalIncome)}
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark-subcard rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Despesas do Ano
              </span>
              <span className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 font-mono-num dark-text-glow-rose">
                {formatCurrency(annualSummary.totalExpense)}
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark-subcard rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Saldo Acumulado
              </span>
              <span className={`text-base sm:text-lg font-bold font-mono-num ${
                annualSummary.netBalance >= 0 
                  ? 'text-emerald-700 dark:text-emerald-400 dark-text-glow-emerald' 
                  : 'text-rose-700 dark:text-rose-400 dark-text-glow-rose'
              }`}>
                {formatCurrency(annualSummary.netBalance)}
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark-subcard rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Taxa Poupança Média
              </span>
              <span className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono-num">
                {annualSummary.savingsRate.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Month-by-month Comparative Bar Chart */}
          <div className="p-5 bg-white dark-subcard rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Comparativo Mensal: Receitas vs Despesas
              </h3>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> Receita
                </span>
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> Despesa
                </span>
              </div>
            </div>

            {/* Vertical Bars representation */}
            <div className="grid grid-cols-12 gap-1.5 sm:gap-2 h-48 items-end pt-4 pb-2 border-b border-slate-200 dark:border-white/10">
              {annualSummary.months.map((m, idx) => {
                const incomePercent = maxMonthValue > 0 ? (m.income / maxMonthValue) * 100 : 0;
                const expensePercent = maxMonthValue > 0 ? (m.expense / maxMonthValue) * 100 : 0;

                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none bg-slate-900 dark:bg-black/90 text-white text-[10px] py-1 px-2 rounded shadow-md whitespace-nowrap border border-white/10">
                      <span>Rec: {formatCurrency(m.income)}</span>
                      <span>Desp: {formatCurrency(m.expense)}</span>
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                      {/* Income Bar */}
                      <div
                        className="w-1/2 bg-emerald-500 hover:bg-emerald-400 rounded-t transition-all"
                        style={{ height: `${Math.max(incomePercent, 3)}%` }}
                        title={`Receita: ${formatCurrency(m.income)}`}
                      />
                      {/* Expense Bar */}
                      <div
                        className="w-1/2 bg-rose-500 hover:bg-rose-400 rounded-t transition-all"
                        style={{ height: `${Math.max(expensePercent, 3)}%` }}
                        title={`Despesa: ${formatCurrency(m.expense)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Month names label under chart */}
            <div className="grid grid-cols-12 gap-1.5 sm:gap-2 pt-2 text-center text-[10px] sm:text-xs text-slate-500 font-medium">
              {MONTH_NAMES.map((name, i) => (
                <div key={i} className="truncate">
                  {name.slice(0, 3)}
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Monthly Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-black/40 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-4 py-2.5">Mês</th>
                  <th className="px-4 py-2.5 text-right">Receitas</th>
                  <th className="px-4 py-2.5 text-right">Despesas</th>
                  <th className="px-4 py-2.5 text-right">Saldo Líquido</th>
                  <th className="px-4 py-2.5 text-right">Taxa Poupança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] font-mono-num">
                {annualSummary.months.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-2 font-sans font-medium text-slate-800 dark:text-slate-200">
                      {MONTH_NAMES[idx]}
                    </td>
                    <td className="px-4 py-2 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(m.income)}
                    </td>
                    <td className="px-4 py-2 text-right text-rose-600 dark:text-rose-400">
                      {formatCurrency(m.expense)}
                    </td>
                    <td className={`px-4 py-2 text-right font-bold ${
                      m.net >= 0 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {formatCurrency(m.net)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                      {m.savingsRate > 0 ? `${m.savingsRate.toFixed(0)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};
