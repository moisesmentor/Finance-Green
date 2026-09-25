import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Calendar, Tag, CreditCard, FileText, Repeat, Layers, Calculator, Plus, Palette } from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod, MonthPeriod, Category } from '../types';
import { CATEGORIES, PAYMENT_METHODS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

const PRESET_COLORS = [
  { name: 'Esmeralda', hex: '#059669' },
  { name: 'Azul Céu', hex: '#0284c7' },
  { name: 'Índigo', hex: '#4f46e5' },
  { name: 'Roxo', hex: '#9333ea' },
  { name: 'Rosa', hex: '#db2777' },
  { name: 'Coral', hex: '#e11d48' },
  { name: 'Laranja', hex: '#ea580c' },
  { name: 'Âmbar', hex: '#d97706' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Grafite', hex: '#475569' },
];

const PRESET_ICONS = [
  'Tag',
  'Gift',
  'ShoppingBag',
  'Plane',
  'HeartPulse',
  'Baby',
  'PawPrint',
  'Dumbbell',
  'Coffee',
  'Utensils',
  'Car',
  'Home',
  'Tv',
  'BookOpen',
  'Music',
  'Film',
  'Scissors',
  'Wrench',
  'Shield',
  'Smartphone',
  'Smile',
  'Store',
  'PiggyBank',
  'Heart',
  'Star',
  'Fuel',
  'Laptop',
];

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
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#059669');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const [catError, setCatError] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

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
    setCatError('');
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

  const handleSaveNewCategory = async () => {
    if (!newCatName.trim()) {
      setCatError('Informe o nome da categoria.');
      return;
    }

    const slug = newCatName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');

    const newCatId = `custom_${slug}_${Date.now().toString(36)}`;

    const newCategory: Category = {
      id: newCatId,
      name: newCatName.trim(),
      icon: newCatIcon,
      color: newCatColor,
      type: newCatType,
      isCustom: true,
      createdAt: Date.now(),
    };

    setIsSavingCategory(true);
    try {
      if (onSaveCustomCategory) {
        await onSaveCustomCategory(newCategory);
      }
      setCategoryId(newCatId);
      setIsCreatingCategory(false);
      setNewCatName('');
      setCatError('');
    } catch (err) {
      setCatError('Falha ao salvar categoria. Tente novamente.');
    } finally {
      setIsSavingCategory(false);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-transaction"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {initialData ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                id="btn-toggle-expense"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs border border-slate-200/80 dark:border-slate-600'
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
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-600'
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
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="tx-amount" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valor Total (R$) <span className="text-rose-500">*</span>
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
                    const val = e.target.value.replace(/[^0-9,.]/g, '');
                    setAmountStr(val);
                  }}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono-num font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
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
                  onClick={() => {
                    setNewCatType(type);
                    setIsCreatingCategory(prev => !prev);
                  }}
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
                    setNewCatType(type);
                    setIsCreatingCategory(true);
                  } else {
                    setCategoryId(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
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
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Sub-card: Formulário de Criação de Categoria Personalizada */}
          {isCreatingCategory && (
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Criar Categoria Personalizada
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Ficará salva exclusivamente na sua conta para uso futuro
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {catError && (
                <div className="p-2 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                  {catError}
                </div>
              )}

              {/* Nome & Tipo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Categoria <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => {
                      setNewCatName(e.target.value);
                      if (catError) setCatError('');
                    }}
                    placeholder="Ex: Cursos & Mentoria, Presentes, Academia..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Lançamento
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setNewCatType('expense')}
                      className={`py-1 text-[11px] font-semibold rounded cursor-pointer transition-all ${
                        newCatType === 'expense'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCatType('income')}
                      className={`py-1 text-[11px] font-semibold rounded cursor-pointer transition-all ${
                        newCatType === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Receita
                    </button>
                  </div>
                </div>
              </div>

              {/* Seletor de Cores */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cor da Categoria
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.name}
                      onClick={() => setNewCatColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                        newCatColor === c.hex ? 'scale-125 ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-900' : 'hover:scale-110 opacity-90'
                      }`}
                    >
                      {newCatColor === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de Ícones */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ícone Representativo
                </label>
                <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 max-h-28 overflow-y-auto p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  {PRESET_ICONS.map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewCatIcon(iconName)}
                      className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        newCatIcon === iconName
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs scale-105'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title={iconName}
                    >
                      <CategoryIcon name={iconName} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview & Botões */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-emerald-500/20">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-xs"
                  style={{
                    backgroundColor: `${newCatColor}15`,
                    borderColor: `${newCatColor}35`,
                    color: newCatColor,
                  }}
                >
                  <CategoryIcon name={newCatIcon} className="w-4 h-4" />
                  <span className="font-bold text-xs">
                    {newCatName.trim() || 'Prévia da Categoria'}
                  </span>
                  <span className="text-[10px] opacity-75 font-semibold">
                    • {newCatType === 'expense' ? 'Despesa' : 'Receita'}
                  </span>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!newCatName.trim() || isSavingCategory}
                    onClick={handleSaveNewCategory}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isSavingCategory ? 'Salvando...' : 'Salvar e Usar Categoria'}
                  </button>
                </div>
              </div>
            </div>
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
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
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
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
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
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-transaction"
              className="px-5 py-2 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
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
