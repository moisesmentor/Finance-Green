import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Calendar, Tag, CreditCard, FileText, Repeat, Layers, Calculator, Plus } from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod, MonthPeriod, Category } from '../types';
import { CATEGORIES, PAYMENT_METHODS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { CreateCategoryForm } from './CreateCategoryForm';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    transaction: Omit<Transaction, 'id' | 'createdAt'>,
    id?: string,
    installmentsCount?: number,
    recurringMonths?: number
  ) => void;
  initialData?: Transaction | null;
  currentPeriod: MonthPeriod;
  customCategories?: Category[];
  onSaveCustomCategory?: (category: Category) => Promise<void> | void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentPeriod,
  customCategories,
  onSaveCustomCategory,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');
  
  // Installment states
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(2);

  // Recurrence states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState(6);

  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Custom Category Creation State
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Combined categories list (System + User Custom)
  const allCategories = useMemo(() => {
    return [...CATEGORIES, ...(customCategories || [])];
  }, [customCategories]);

  // Default date in YYYY-MM-DD for current month
  const getDefaultDate = (period: MonthPeriod) => {
    const today = new Date();
    if (today.getFullYear() === period.year && today.getMonth() === period.month) {
      return today.toISOString().split('T')[0];
    }
    const month = String(period.month + 1).padStart(2, '0');
    return `${period.year}-${month}-01`;
  };

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setDescription(initialData.description);
      setAmountStr(initialData.amount.toString().replace('.', ','));
      setCategoryId(initialData.categoryId);
      setDate(initialData.date);
      setPaymentMethod(initialData.paymentMethod);
      setStatus(initialData.status);
      setIsInstallment(!!initialData.installmentTotal && initialData.installmentTotal > 1);
      setInstallmentsCount(initialData.installmentTotal || 2);
      setIsRecurring(!!initialData.isRecurring);
      setRecurringMonths(6);
      setNotes(initialData.notes || '');
    } else {
      setType('expense');
      setDescription('');
      setAmountStr('');
      const defaultExpenseCat = allCategories.find(c => c.type === 'expense');
      setCategoryId(defaultExpenseCat ? defaultExpenseCat.id : 'outros_gastos');
      setDate(getDefaultDate(currentPeriod));
      setPaymentMethod('pix');
      setStatus('paid');
      setIsInstallment(false);
      setInstallmentsCount(2);
      setIsRecurring(false);
      setRecurringMonths(6);
      setNotes('');
    }
    setError('');
    setIsCreatingCategory(false);
  }, [initialData, isOpen, currentPeriod, allCategories]);

  // When type changes, adjust category selection
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const validCats = allCategories.filter(c => c.type === newType || c.type === 'both');
    if (!validCats.some(c => c.id === categoryId)) {
      if (validCats.length > 0) {
        setCategoryId(validCats[0].id);
      }
    }
  };

  if (!isOpen) return null;

  const filteredCategories = allCategories.filter(c => c.type === type || c.type === 'both');

  const parsedAmount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.')) || 0;
  const installmentValue = installmentsCount > 0 ? parsedAmount / installmentsCount : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setError('Informe uma descrição para o gasto ou receita.');
      return;
    }

    const cleanedAmount = amountStr.replace(/\./g, '').replace(',', '.');
    const amountNum = parseFloat(cleanedAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Digite um valor monetário válido maior que zero.');
      return;
    }

    if (!categoryId) {
      setError('Selecione uma categoria.');
      return;
    }

    if (!date) {
      setError('Selecione uma data.');
      return;
    }

    onSave(
      {
        description: description.trim(),
        amount: Math.round(amountNum * 100) / 100,
        type,
        categoryId,
        date,
        paymentMethod,
        status,
        isRecurring,
        recurringFrequency: isRecurring ? 'monthly' : undefined,
        notes: notes.trim() || undefined,
      },
      initialData?.id,
      !initialData && isInstallment ? installmentsCount : undefined,
      !initialData && isRecurring ? recurringMonths : undefined
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-transaction"
        className="bg-white dark-brushed-metal-modal rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {initialData ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-medium">
              {error}
            </div>
          )}

          {/* Type Toggle: Despesa vs Receita */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Tipo da Transação
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-black/50 rounded-xl border border-slate-200 dark:border-white/10">
              <button
                type="button"
                id="btn-toggle-expense"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white dark:bg-white/10 text-rose-600 dark:text-rose-400 shadow-xs border border-slate-200/80 dark:border-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Despesa (Gasto)
              </button>
              <button
                type="button"
                id="btn-toggle-income"
                onClick={() => handleTypeChange('income')}
                className={`py-2 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'income'
                    ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Receita (Entrada)
              </button>
            </div>
          </div>

          {/* Descrição & Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-description" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descrição <span className="text-rose-500">*</span>
              </label>
              <input
                id="tx-description"
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={type === 'expense' ? 'Ex: Supermercado, Aluguel...' : 'Ex: Salário, Freelance...'}
                className="w-full px-3 py-2 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="tx-amount" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valor Total (R$) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-base sm:text-sm font-semibold text-slate-400">
                  R$
                </span>
                <input
                  id="tx-amount"
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9,.]/g, '');
                    setAmountStr(val);
                  }}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2 text-base sm:text-sm font-mono-num font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Categoria & Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="tx-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Categoria <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(prev => !prev)}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Nova categoria
                </button>
              </div>

              <select
                id="tx-category"
                value={categoryId}
                onChange={e => {
                  if (e.target.value === '__create_new__') {
                    setIsCreatingCategory(true);
                  } else {
                    setCategoryId(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {filteredCategories.some(c => c.isCustom) && (
                  <optgroup label="⭐ Minhas Categorias">
                    {filteredCategories.filter(c => c.isCustom).map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Categorias do Sistema">
                  {filteredCategories.filter(c => !c.isCustom).map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
                <option value="__create_new__" className="font-bold text-emerald-600 dark:text-emerald-400">
                  ➕ + Criar nova categoria...
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data de Vencimento / Pagamento <span className="text-rose-500">*</span>
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Sub-card: Formulário Reutilizável de Criação de Categoria Personalizada */}
          {isCreatingCategory && (
            <CreateCategoryForm
              onClose={() => setIsCreatingCategory(false)}
              onSave={async (newCategory) => {
                if (onSaveCustomCategory) {
                  await onSaveCustomCategory(newCategory);
                }
                setCategoryId(newCategory.id);
                setIsCreatingCategory(false);
              }}
              existingCategories={allCategories}
              defaultType={type}
              showTypeSelector={true}
              showInitialBudget={false}
              title="Criar Categoria Personalizada"
              subtitle="Ficará salva exclusivamente na sua conta para uso futuro em todo o app"
            />
          )}

          {/* Forma de Pagamento & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-payment-method" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Forma de Pagamento
              </label>
              <select
                id="tx-payment-method"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {PAYMENT_METHODS.map(pm => (
                  <option key={pm.id} value={pm.id}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  id="btn-status-paid"
                  onClick={() => setStatus('paid')}
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    status === 'paid'
                       ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {type === 'expense' ? 'Já Pago' : 'Recebido'}
                </button>
                <button
                  type="button"
                  id="btn-status-pending"
                  onClick={() => setStatus('pending')}
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    status === 'pending'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {type === 'expense' ? 'Pendente (A pagar)' : 'A receber'}
                </button>
              </div>
            </div>
          </div>

          {/* PARCELAMENTO (Disponível para Despesas e Receitas) */}
          {!initialData && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2.5">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={e => {
                    setIsInstallment(e.target.checked);
                    if (e.target.checked) setIsRecurring(false);
                  }}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  {type === 'expense' 
                    ? 'Compra / Despesa Parcelada (dividir valor total em parcelas)' 
                    : 'Receita Parcelada (dividir valor recebido em parcelas)'}
                </span>
              </label>

              {isInstallment && (
                <div className="space-y-2.5 pt-1 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Quantidade de Parcelas
                      </label>
                      <select
                        value={installmentsCount}
                        onChange={e => setInstallmentsCount(parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 text-base sm:text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                      >
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60].map(n => (
                          <option key={n} value={n}>
                            {n}x parcelas {n === 2 ? (type === 'income' ? '(ex: 13º em 2x)' : '') : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col justify-center px-3 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                      <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400">
                        {type === 'expense' ? 'Gasto por Parcela' : 'Entrada por Parcela'}
                      </span>
                      <span className="text-sm font-bold font-mono-num text-indigo-900 dark:text-indigo-200">
                        {formatCurrency(installmentValue)} /mês
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    💡 Serão criadas {installmentsCount} movimentações individuais no extrato com numeração (ex: 1/{installmentsCount}, 2/{installmentsCount}...).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* RECORRÊNCIA (Lançamento Fixo para Despesas e Receitas) */}
          {!initialData && !isInstallment && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2.5">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-emerald-500" />
                  {type === 'expense' 
                    ? 'Despesa Fixa / Recorrente (repetir valor todo mês)' 
                    : 'Receita Fixa / Recorrente (salário, pro-labore, contrato)'}
                </span>
              </label>

              {isRecurring && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Repetir por quantos meses:
                    </label>
                    <select
                      value={recurringMonths}
                      onChange={e => setRecurringMonths(parseInt(e.target.value, 10))}
                      className="px-3 py-1.5 text-base sm:text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <option value={2}>2 meses</option>
                      <option value={3}>3 meses</option>
                      <option value={4}>4 meses</option>
                      <option value={5}>5 meses</option>
                      <option value={6}>6 meses (semestre)</option>
                      <option value={7}>7 meses</option>
                      <option value={8}>8 meses</option>
                      <option value={9}>9 meses</option>
                      <option value={10}>10 meses</option>
                      <option value={11}>11 meses</option>
                      <option value={12}>12 meses (1 ano)</option>
                      <option value={18}>18 meses (1 ano e meio)</option>
                      <option value={24}>24 meses (2 anos)</option>
                      <option value={36}>36 meses (3 anos)</option>
                      <option value={48}>48 meses (4 anos)</option>
                      <option value={60}>60 meses (5 anos)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    💡 Cada mês receberá um lançamento individual no extrato numerado (ex: 1/{recurringMonths}, 2/{recurringMonths}...) no valor de {formatCurrency(parsedAmount)}.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Observações */}
          <div>
            <label htmlFor="tx-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observações (Opcional)
            </label>
            <input
              id="tx-notes"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Compra do almoço de domingo, taxa de entrega..."
              className="w-full px-3 py-2 text-base sm:text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-transaction"
              className="px-5 py-2 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs dark:shadow-[0_0_20px_-3px_rgba(16,185,129,0.45)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {initialData ? 'Salvar Alterações' : 'Adicionar Transação'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
