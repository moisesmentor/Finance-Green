import React, { useState, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Check, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  Trash2, 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  FileText, 
  X,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import { Transaction, Category, PaymentMethod, ParsedBankTransaction, BankParseResult } from '../types';
import { CATEGORIES, PAYMENT_METHODS } from '../utils/constants';
import { formatCurrency, formatDateReadable } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { parseBankFile } from '../utils/bankParsers';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';

interface ImportBankStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  existingTransactions: Transaction[];
  onSaveBatchTransactions: (transactions: Transaction[]) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ImportBankStatementModal: React.FC<ImportBankStatementModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingTransactions,
  onSaveBatchTransactions,
  showToast,
}) => {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Resultados do parser
  const [parseResult, setParseResult] = useState<BankParseResult | null>(null);
  const [reviewItems, setReviewItems] = useState<ParsedBankTransaction[]>([]);

  // Filtros da caixa de revisão
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'selected' | 'duplicates'>('all');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>('credit_card');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapa rápido de categorias
  const categoryMap = new Map<string, Category>();
  for (const c of categories) {
    categoryMap.set(c.id, c);
  }

  /* =========================================================================
     1. PROCESSAMENTO DO ARQUIVO (UPLOAD)
     ========================================================================= */

  const processFile = async (file: File) => {
    setIsParsing(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const result = parseBankFile(text, file.name, categories, existingTransactions);

      if (result.transactions.length === 0) {
        showToast('Nenhuma transação identificada no arquivo. Verifique se o formato é OFX ou CSV.', 'warning');
        setIsParsing(false);
        return;
      }

      // Aplica a forma de pagamento selecionada inicialmente se o arquivo for de cartão
      const adjusted = result.transactions.map(t => ({
        ...t,
        paymentMethod: t.paymentMethod || defaultPaymentMethod,
      }));

      setParseResult(result);
      setReviewItems(adjusted);
      setStep('review');
      showToast(`${adjusted.length} transações identificadas! Revise antes de aprovar.`, 'success');
    } catch (err: any) {
      console.error('Erro ao processar extrato bancário:', err);
      showToast('Falha ao processar arquivo. Verifique se o formato é válido.', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  /* =========================================================================
     2. MANIPULAÇÃO DA LISTA DE REVISÃO
     ========================================================================= */

  const handleToggleSelect = (id: string) => {
    setReviewItems(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const handleSelectAll = (select: boolean) => {
    setReviewItems(prev => prev.map(t => ({ ...t, selected: select })));
  };

  const handleUpdateItem = (id: string, updates: Partial<ParsedBankTransaction>) => {
    setReviewItems(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteItem = (id: string) => {
    setReviewItems(prev => prev.filter(t => t.id !== id));
  };

  // Itens filtrados para exibição
  const filteredItems = useMemo(() => {
    return reviewItems.filter(item => {
      // Filtro por tipo/status
      if (filterType === 'expense' && item.type !== 'expense') return false;
      if (filterType === 'income' && item.type !== 'income') return false;
      if (filterType === 'selected' && !item.selected) return false;
      if (filterType === 'duplicates' && !item.isDuplicate && !item.isInvoicePayment) return false;

      // Filtro por busca de texto
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchOrig = item.originalDescription.toLowerCase().includes(q);
        const matchVal = item.amount.toString().includes(q);
        if (!matchDesc && !matchOrig && !matchVal) return false;
      }

      return true;
    });
  }, [reviewItems, filterType, search]);

  // Estatísticas dos itens selecionados
  const stats = useMemo(() => {
    let selectedCount = 0;
    let selectedExpenseTotal = 0;
    let selectedIncomeTotal = 0;
    let duplicateCount = 0;
    let invoiceCount = 0;

    for (const item of reviewItems) {
      if (item.isDuplicate) duplicateCount++;
      if (item.isInvoicePayment) invoiceCount++;

      if (item.selected) {
        selectedCount++;
        if (item.type === 'expense') selectedExpenseTotal += item.amount;
        else selectedIncomeTotal += item.amount;
      }
    }

    return {
      total: reviewItems.length,
      selectedCount,
      selectedExpenseTotal,
      selectedIncomeTotal,
      netSelected: selectedIncomeTotal - selectedExpenseTotal,
      duplicateCount,
      invoiceCount,
    };
  }, [reviewItems]);

  /* =========================================================================
     3. APROVAÇÃO E GRAVAÇÃO EM LOTE
     ========================================================================= */

  const handleApprove = async () => {
    const selected = reviewItems.filter(t => t.selected);
    if (selected.length === 0) {
      showToast('Nenhuma transação selecionada para importação.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const newTransactions: Transaction[] = selected.map(item => ({
        id: `tx-imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: item.description.trim() || item.originalDescription,
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        date: item.date,
        paymentMethod: item.paymentMethod,
        status: 'paid', // Transações de extrato já foram liquidadas
        notes: item.notes || `Importado de ${fileName || 'extrato bancário'}`,
        createdAt: Date.now(),
      }));

      await onSaveBatchTransactions(newTransactions);
      showToast(`${newTransactions.length} transações importadas com sucesso!`, 'success');
      handleReset();
      onClose();
    } catch (err: any) {
      console.error('Erro ao aprovar transações importadas:', err);
      showToast('Erro ao gravar transações. Tente novamente.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setParseResult(null);
    setReviewItems([]);
    setSearch('');
    setFilterType('all');
  };

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-import-bank-statement"
        className="bg-white dark:bg-[#161619] rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs dark:shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Importar Extrato Bancário
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  OFX & CSV
                </span>
                {parseResult?.bankName && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                    <Building2 className="w-3 h-3" /> {parseResult.bankName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 'upload' 
                  ? 'Arraste ou selecione o arquivo OFX ou CSV do Nubank, Santander ou outros bancos'
                  : `Revise e aprove os lançamentos de "${fileName}"`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            PASSO 1: UPLOAD DO ARQUIVO
            ========================================================================= */}
        {step === 'upload' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 scale-[1.01]' 
                  : 'border-slate-300 dark:border-white/15 bg-slate-50/50 dark:bg-white/[0.02] hover:border-emerald-500/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx,.csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                {isParsing ? (
                  <RefreshCw className="w-7 h-7 animate-spin" />
                ) : (
                  <UploadCloud className="w-7 h-7" />
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                  {isParsing ? 'Processando e categorizando...' : 'Clique para selecionar ou arraste o arquivo aqui'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Suporta arquivos <b>.OFX</b> e <b>.CSV</b> (tamanho máx: 10MB)
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Nubank (Conta & Cartão)
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                  Santander (Extrato & Way)
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  Itaú / Bradesco / Inter
                </span>
              </div>
            </div>

            {/* Configuração de Forma de Pagamento Padrão */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                Forma de Pagamento sugerida para este extrato:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDefaultPaymentMethod('credit_card')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    defaultPaymentMethod === 'credit_card'
                      ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-900 dark:text-white font-bold'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1e] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Fatura de Cartão de Crédito</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Compras no crédito (ex: Fatura Nubank / Santander Way)</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDefaultPaymentMethod('debit_card')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    defaultPaymentMethod === 'debit_card'
                      ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-900 dark:text-white font-bold'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1e] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Extrato de Conta Corrente / Débito</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Entradas, Pix, transferências e débitos em conta</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Como exportar no Nubank e Santander */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] space-y-1">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  🟣 Como exportar no Nubank:
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  <b>Cartão:</b> No app Nubank &gt; Cartão de crédito &gt; Meus boletos/Fatura &gt; Exportar fatura (.OFX ou .CSV).<br />
                  <b>Conta:</b> Tela inicial &gt; Conta &gt; Pedir extrato &gt; Escolha o mês e o formato OFX/CSV.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] space-y-1">
                <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  🔴 Como exportar no Santander:
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  <b>Internet Banking:</b> Conta Corrente &gt; Extrato &gt; Selecione o período &gt; Salvar em OFX.<br />
                  <b>App Santander Way:</b> Fatura &gt; Exportar fatura em formato OFX ou CSV.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            PASSO 2: CAIXA DE REVISÃO E APROVAÇÃO
            ========================================================================= */}
        {step === 'review' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            
            {/* Barra Superior de Métricas */}
            <div className="p-4 sm:px-6 bg-slate-50 dark:bg-[#1a1a1e] border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-white dark:bg-black/30 border border-slate-200/80 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total no Arquivo</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200">{stats.total} itens</span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Selecionadas</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{stats.selectedCount} de {stats.total}</span>
                </div>

                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Despesas Sel.</span>
                  <span className="text-base font-bold text-rose-600 dark:text-rose-400">{formatCurrency(stats.selectedExpenseTotal)}</span>
                </div>

                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">Receitas Sel.</span>
                  <span className="text-base font-bold text-sky-600 dark:text-sky-400">{formatCurrency(stats.selectedIncomeTotal)}</span>
                </div>
              </div>

              {/* Alerta de Duplicatas e Faturas */}
              {(stats.duplicateCount > 0 || stats.invoiceCount > 0) && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      {stats.duplicateCount > 0 && `${stats.duplicateCount} possível(is) duplicata(s) `}
                      {stats.duplicateCount > 0 && stats.invoiceCount > 0 && 'e '}
                      {stats.invoiceCount > 0 && `${stats.invoiceCount} pagamento(s) de fatura `}
                      foram desmarcados automaticamente por segurança.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilterType('duplicates')}
                    className="text-[11px] font-bold underline hover:text-amber-800 dark:hover:text-amber-200 cursor-pointer shrink-0"
                  >
                    Ver alertas
                  </button>
                </div>
              )}
            </div>

            {/* Toolbar de Ações e Filtros */}
            <div className="px-6 py-3 border-b border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white dark:bg-[#161619]">
              
              {/* Seleção em massa */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Marcar todas</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Desmarcar todas</span>
                </button>
              </div>

              {/* Tabs de Filtro */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/30 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-white dark:bg-[#202024] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Todas ({reviewItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('selected')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    filterType === 'selected'
                      ? 'bg-white dark:bg-[#202024] text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Sel. ({stats.selectedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('expense')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    filterType === 'expense'
                      ? 'bg-white dark:bg-[#202024] text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Despesas
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('income')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    filterType === 'income'
                      ? 'bg-white dark:bg-[#202024] text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Receitas
                </button>
              </div>

              {/* Busca por texto */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar lançamento..."
                  className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

            </div>

            {/* Lista Rolável de Transações */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 p-4 sm:px-6">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <p className="text-sm font-semibold">Nenhuma transação encontrada com os filtros atuais.</p>
                  <button
                    type="button"
                    onClick={() => { setFilterType('all'); setSearch(''); }}
                    className="text-xs text-emerald-500 font-bold hover:underline cursor-pointer"
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                filteredItems.map(item => {
                  const currentCategory = categoryMap.get(item.categoryId);
                  return (
                    <div
                      key={item.id}
                      className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl px-2 transition-colors ${
                        item.selected 
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/15' 
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {/* Checkbox + Data + Descrição */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(item.id)}
                          className="cursor-pointer text-emerald-600 dark:text-emerald-400 shrink-0"
                        >
                          {item.selected ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>

                        <div className="w-24 shrink-0">
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => handleUpdateItem(item.id, { date: e.target.value })}
                            className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
                          />
                        </div>

                        {/* Descrição editável */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                            className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-emerald-500 focus:outline-none transition-colors"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 truncate max-w-xs">
                              Original: {item.originalDescription}
                            </span>
                            {item.isDuplicate && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Possível duplicata no app
                              </span>
                            )}
                            {item.isInvoicePayment && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                Pagamento de Fatura
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Categoria + Forma de Pagamento + Valor + Remover */}
                      <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                        
                        {/* Seletor de Categoria */}
                        <div className="relative">
                          <select
                            value={item.categoryId}
                            onChange={(e) => handleUpdateItem(item.id, { categoryId: e.target.value })}
                            className="text-[11px] font-semibold py-1.5 pl-2.5 pr-6 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1e] text-slate-800 dark:text-slate-200 appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Seletor de Forma de Pagamento */}
                        <div className="relative">
                          <select
                            value={item.paymentMethod}
                            onChange={(e) => handleUpdateItem(item.id, { paymentMethod: e.target.value as PaymentMethod })}
                            className="text-[11px] font-semibold py-1.5 pl-2 pr-5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1e] text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            {PAYMENT_METHODS.map(pm => (
                              <option key={pm.id} value={pm.id}>
                                {pm.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Valor Formatado */}
                        <div className="w-24 text-right">
                          <span className={`text-xs font-bold font-mono ${
                            item.type === 'income' 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {item.type === 'income' ? '+ ' : '- '}
                            {formatCurrency(item.amount)}
                          </span>
                        </div>

                        {/* Botão de Excluir da Importação */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Remover este lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-black/20 shrink-0">
          {step === 'review' ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Voltar / Enviar outro arquivo
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                  {stats.selectedCount} selecionada(s)
                </span>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSaving || stats.selectedCount === 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-md dark:shadow-[0_0_20px_-3px_rgba(16,185,129,0.5)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gravando lançamentos...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Aprovar e Lançar ({stats.selectedCount})</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
