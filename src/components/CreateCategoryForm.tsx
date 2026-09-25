import React, { useState } from 'react';
import { Plus, X, Check, AlertCircle, Target } from 'lucide-react';
import { Category, TransactionType } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { parseCurrencyInput } from '../utils/formatters';

export const PRESET_ICONS = [
  'Tag',
  'ShoppingCart',
  'CreditCard',
  'DollarSign',
  'Receipt',
  'Package',
  'Gift',
  'Briefcase',
  'GraduationCap',
  'HeartPulse',
  'Plane',
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

export const PRESET_COLORS = [
  { name: 'Esmeralda', hex: '#059669' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Azul', hex: '#2563eb' },
  { name: 'Índigo', hex: '#4f46e5' },
  { name: 'Roxo', hex: '#7c3aed' },
  { name: 'Rosa', hex: '#db2777' },
  { name: 'Vermelho', hex: '#e11d48' },
  { name: 'Laranja', hex: '#ea580c' },
  { name: 'Âmbar', hex: '#d97706' },
  { name: 'Grafite', hex: '#475569' },
];

export interface CreateCategoryFormProps {
  onClose: () => void;
  onSave: (category: Category, initialBudgetLimit?: number) => Promise<void> | void;
  existingCategories: Category[];
  defaultType?: TransactionType;
  showTypeSelector?: boolean;
  showInitialBudget?: boolean;
  title?: string;
  subtitle?: string;
}

export const CreateCategoryForm: React.FC<CreateCategoryFormProps> = ({
  onClose,
  onSave,
  existingCategories,
  defaultType = 'expense',
  showTypeSelector = true,
  showInitialBudget = false,
  title = 'Criar Categoria Personalizada',
  subtitle = 'Ficará salva exclusivamente na sua conta para uso futuro em todo o app',
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#059669');
  const [newCatType, setNewCatType] = useState<TransactionType>(defaultType);
  const [budgetLimitStr, setBudgetLimitStr] = useState('');
  const [catError, setCatError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmedName = newCatName.trim();

    if (!trimmedName) {
      setCatError('Informe o nome da categoria.');
      return;
    }

    // Check duplicate name
    const normalizedNew = trimmedName.toLowerCase();
    const alreadyExists = existingCategories.some(
      c => c.name.trim().toLowerCase() === normalizedNew
    );

    if (alreadyExists) {
      setCatError(`Já existe uma categoria chamada "${trimmedName}". Escolha outro nome.`);
      return;
    }

    const slug = trimmedName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');

    const newCatId = `custom_${slug}_${Date.now().toString(36)}`;

    const newCategory: Category = {
      id: newCatId,
      name: trimmedName,
      icon: newCatIcon,
      color: newCatColor,
      type: newCatType,
      isCustom: true,
      createdAt: Date.now(),
    };

    let budgetNum: number | undefined = undefined;
    if (showInitialBudget && budgetLimitStr) {
      const parsed = parseCurrencyInput(budgetLimitStr);
      if (parsed > 0) {
        budgetNum = parsed;
      }
    }


    setIsSaving(true);
    try {
      await onSave(newCategory, budgetNum);
      onClose();
    } catch (err) {
      setCatError('Falha ao salvar categoria. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {title}
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Error message */}
      {catError && (
        <div className="p-2 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{catError}</span>
        </div>
      )}

      {/* Nome, Tipo & Teto Inicial */}
      <div className={`grid grid-cols-1 ${showTypeSelector && showInitialBudget ? 'sm:grid-cols-4' : showTypeSelector || showInitialBudget ? 'sm:grid-cols-3' : 'sm:grid-cols-1'} gap-3`}>
        
        {/* Nome */}
        <div className={showTypeSelector || showInitialBudget ? 'sm:col-span-2' : ''}>
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
            placeholder="Ex: Cursos & Mentoria, Pets, Academia..."
            className="w-full px-3 py-1.5 text-base sm:text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            autoFocus
          />
        </div>

        {/* Tipo (se habilitado) */}
        {showTypeSelector && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tipo
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
        )}

        {/* Teto Inicial (se habilitado para o modal de Orçamentos) */}
        {showInitialBudget && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Meta / Teto Mensal (R$)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={budgetLimitStr}
                onChange={e => {
                  const clean = e.target.value.replace(/[^0-9.,]/g, '');
                  setBudgetLimitStr(clean);
                }}
                placeholder="Ex: 500"
                className="w-full px-3 py-1.5 text-base sm:text-xs font-mono-num font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>
        )}

      </div>

      {/* Seletor de Cores */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Cor de Identificação
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
        <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 max-h-28 overflow-y-auto p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
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

      {/* Live Preview & Botões de Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-emerald-500/20">
        
        {/* Preview */}
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
          {showInitialBudget && budgetLimitStr && (
            <span className="text-[10px] font-mono-num font-bold px-1.5 py-0.5 rounded bg-white/40 dark:bg-black/30">
              Meta: R$ {budgetLimitStr}
            </span>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!newCatName.trim() || isSaving}
            onClick={handleSave}
            id="btn-confirm-save-category"
            className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {isSaving ? 'Salvando...' : 'Salvar e Usar Categoria'}
          </button>
        </div>

      </div>

    </div>
  );
};
