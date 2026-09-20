import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Tag, CreditCard, FileText, Repeat } from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod, MonthPeriod } from '../types';
import { CATEGORIES, PAYMENT_METHODS } from '../utils/constants';
import { CategoryIcon } from './CategoryIcon';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt'>, id?: string) => void;
  initialData?: Transaction | null;
  currentPeriod: MonthPeriod;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentPeriod,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

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
      setIsRecurring(!!initialData.isRecurring);
      setNotes(initialData.notes || '');
    } else {
      setType('expense');
      setDescription('');
      setAmountStr('');
      const defaultExpenseCat = CATEGORIES.find(c => c.type === 'expense');
      setCategoryId(defaultExpenseCat ? defaultExpenseCat.id : 'outros_gastos');
      setDate(getDefaultDate(currentPeriod));
      setPaymentMethod('pix');
      setStatus('paid');
      setIsRecurring(false);
      setNotes('');
    }
    setError('');
  }, [initialData, isOpen, currentPeriod]);

  // When type changes, adjust category selection to match valid category
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const validCats = CATEGORIES.filter(c => c.type === newType || c.type === 'both');
    if (!validCats.some(c => c.id === categoryId)) {
      if (validCats.length > 0) {
        setCategoryId(validCats[0].id);
      }
    }
  };

  if (!isOpen) return null;

  const filteredCategories = CATEGORIES.filter(c => c.type === type || c.type === 'both');

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
        notes: notes.trim() || undefined,
      },
      initialData?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-transaction"
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {initialData ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-medium">
              {error}
            </div>
          )}

          {/* Type Toggle: Despesa vs Receita */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tipo da Transação
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                id="btn-toggle-expense"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  type === 'expense'
                    ? 'bg-white text-rose-600 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Despesa (Gasto)
              </button>
              <button
                type="button"
                id="btn-toggle-income"
                onClick={() => handleTypeChange('income')}
                className={`py-2 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  type === 'income'
                    ? 'bg-white text-emerald-600 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
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
              <label htmlFor="tx-description" className="block text-xs font-semibold text-slate-700 mb-1">
                Descrição <span className="text-rose-500">*</span>
              </label>
              <input
                id="tx-description"
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={type === 'expense' ? 'Ex: Supermercado, Aluguel...' : 'Ex: Salário, Freelance...'}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="tx-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                Valor (R$) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-semibold text-slate-400">
                  R$
                </span>
                <input
                  id="tx-amount"
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={e => {
                    // Allow numbers, comma and period
                    const val = e.target.value.replace(/[^0-9,.]/g, '');
                    setAmountStr(val);
                  }}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono-num font-bold rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Categoria & Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-category" className="block text-xs font-semibold text-slate-700 mb-1">
                Categoria <span className="text-rose-500">*</span>
              </label>
              <select
                id="tx-category"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white text-slate-800"
              >
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Vencimento / Pagamento <span className="text-rose-500">*</span>
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white text-slate-800"
              />
            </div>
          </div>

          {/* Forma de Pagamento & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-payment-method" className="block text-xs font-semibold text-slate-700 mb-1">
                Forma de Pagamento
              </label>
              <select
                id="tx-payment-method"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white text-slate-800"
              >
                {PAYMENT_METHODS.map(pm => (
                  <option key={pm.id} value={pm.id}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  id="btn-status-paid"
                  onClick={() => setStatus('paid')}
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                    status === 'paid'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type === 'expense' ? 'Já Pago' : 'Recebido'}
                </button>
                <button
                  type="button"
                  id="btn-status-pending"
                  onClick={() => setStatus('pending')}
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                    status === 'pending'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type === 'expense' ? 'Pendente (A pagar)' : 'A receber'}
                </button>
              </div>
            </div>
          </div>

          {/* Despesa Fixa / Recorrente */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-slate-500" />
                Gasto fixo mensal / Recorrente (ex: aluguel, condomínio, internet)
              </span>
            </label>
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="tx-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Observações (Opcional)
            </label>
            <input
              id="tx-notes"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Parcelamento 2/6, compras do almoço de domingo..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-transaction"
              className="px-5 py-2 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all flex items-center gap-1.5"
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
