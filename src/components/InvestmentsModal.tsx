import React, { useState } from 'react';
import { 
  X, 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Layers, 
  Landmark, 
  Ticket, 
  Trash2, 
  CheckCircle2, 
  Calendar,
  Building2,
  PieChart,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { InvestmentAsset, InvestmentCategoryType, InvestmentEntry } from '../types';
import { formatCurrency, formatDateShort } from '../utils/formatters';
import { AnimatedCounter } from './AnimatedCounter';

interface InvestmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  investments: InvestmentAsset[];
  onSaveInvestments: (investments: InvestmentAsset[]) => void;
  emergencyFundBalance: number;
}

const CATEGORY_METADATA: Record<InvestmentCategoryType, {
  label: string;
  description: string;
  icon: any;
  color: string;
  badgeClass: string;
}> = {
  investments: {
    label: 'Investimentos Gerais',
    description: 'Renda Fixa, CDBs, Tesouro, Ações, FIIs e Fundos',
    icon: TrendingUp,
    color: '#059669',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  consorcio: {
    label: 'Consórcio',
    description: 'Parcelas pagas e cartas de consórcio imobiliário ou auto',
    icon: Layers,
    color: '#4f46e5',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  previdencia: {
    label: 'Previdência Privada',
    description: 'Planos de aposentadoria e previdência complementar PGBL/VGBL',
    icon: Landmark,
    color: '#0284c7',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
  capitalizacao: {
    label: 'Título de Capitalização',
    description: 'Reserva programada bancária com participação em sorteios',
    icon: Ticket,
    color: '#d97706',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
};

export const InvestmentsModal: React.FC<InvestmentsModalProps> = ({
  isOpen,
  onClose,
  investments,
  onSaveInvestments,
  emergencyFundBalance,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<InvestmentCategoryType | null>(null);
  const [movementType, setMovementType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [institution, setInstitution] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [expandedCat, setExpandedCat] = useState<InvestmentCategoryType | null>(null);

  if (!isOpen) return null;

  // Ensure all 4 categories exist in state
  const categoriesList: InvestmentCategoryType[] = ['investments', 'consorcio', 'previdencia', 'capitalizacao'];

  const getAssetByType = (type: InvestmentCategoryType): InvestmentAsset => {
    const found = investments.find(inv => inv.type === type);
    if (found) return found;
    return {
      id: `asset-${type}`,
      type,
      title: CATEGORY_METADATA[type].label,
      balance: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      history: [],
    };
  };

  // Calculate totals
  const investmentsTotal = categoriesList.reduce((acc, type) => {
    return acc + (getAssetByType(type).balance || 0);
  }, 0);

  const grandTotalPatrimonio = emergencyFundBalance + investmentsTotal;

  const handleOpenMovementForm = (type: InvestmentCategoryType, mType: 'deposit' | 'withdraw') => {
    setSelectedCategory(type);
    setMovementType(mType);
    setAmountStr('');
    setDate(new Date().toISOString().split('T')[0]);
    setInstitution('');
    setNote('');
    setError('');
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    const amountNum = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }

    const currentAsset = getAssetByType(selectedCategory);
    const newBalance = movementType === 'deposit'
      ? Math.round((currentAsset.balance + amountNum) * 100) / 100
      : Math.max(0, Math.round((currentAsset.balance - amountNum) * 100) / 100);

    const newEntry: InvestmentEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      amount: Math.round(amountNum * 100) / 100,
      date: date || new Date().toISOString().split('T')[0],
      type: movementType,
      note: note.trim() || (institution ? `Instituição: ${institution}` : undefined),
      createdAt: Date.now(),
    };

    const updatedAsset: InvestmentAsset = {
      ...currentAsset,
      balance: newBalance,
      institution: institution.trim() || currentAsset.institution,
      updatedAt: Date.now(),
      history: [newEntry, ...(currentAsset.history || [])],
    };

    const exists = investments.some(inv => inv.type === selectedCategory);
    const updatedList = exists
      ? investments.map(inv => inv.type === selectedCategory ? updatedAsset : inv)
      : [...investments, updatedAsset];

    onSaveInvestments(updatedList);
    setSelectedCategory(null);
    setAmountStr('');
    setNote('');
    setError('');
  };

  const handleDeleteEntry = (catType: InvestmentCategoryType, entryId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta movimentação? O saldo será recalculado.')) return;

    const currentAsset = getAssetByType(catType);
    const targetEntry = currentAsset.history?.find(h => h.id === entryId);
    if (!targetEntry) return;

    const newBalance = targetEntry.type === 'deposit'
      ? Math.max(0, Math.round((currentAsset.balance - targetEntry.amount) * 100) / 100)
      : Math.round((currentAsset.balance + targetEntry.amount) * 100) / 100;

    const updatedAsset: InvestmentAsset = {
      ...currentAsset,
      balance: newBalance,
      updatedAt: Date.now(),
      history: (currentAsset.history || []).filter(h => h.id !== entryId),
    };

    const updatedList = investments.map(inv => inv.type === catType ? updatedAsset : inv);
    onSaveInvestments(updatedList);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-investments"
        className="bg-white dark-brushed-metal-modal rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 dark-glow-emerald">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Investimentos & Patrimônio Total
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhe o crescimento dos seus ativos, consórcios e previdência
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

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. TOP HERO: PATRIMÔNIO TOTAL CONSOLIDADO */}
          <div className="p-5 rounded-2xl bg-slate-900 dark:bg-[#151518] text-white border border-emerald-500/30 shadow-lg relative overflow-hidden dark-glow-emerald">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <PieChart className="w-3 h-3" />
                    Patrimônio Consolidado
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">• Total Líquido Acumulado</span>
                </div>

                <div className="text-3xl sm:text-4xl font-black font-mono-num text-white tracking-tight dark-text-glow-emerald">
                  <AnimatedCounter value={grandTotalPatrimonio} />
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Reserva de Emergência Ativa:</span>
                <span className="text-sm sm:text-base font-extrabold font-mono-num text-emerald-400 dark-text-glow-emerald">
                  {formatCurrency(emergencyFundBalance)}
                </span>
              </div>
            </div>

            {/* Distribution Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 border-t border-slate-800/80 mt-4 text-[11px] relative z-10">
              <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                <span className="text-slate-400 block">🛡️ Reserva:</span>
                <strong className="font-mono-num text-emerald-400 font-bold">{formatCurrency(emergencyFundBalance)}</strong>
              </div>
              {categoriesList.map(type => {
                const asset = getAssetByType(type);
                const meta = CATEGORY_METADATA[type];
                return (
                  <div key={type} className="p-2 rounded-lg bg-black/40 border border-white/10">
                    <span className="text-slate-400 block truncate">{meta.label}:</span>
                    <strong className="font-mono-num text-white font-bold">{formatCurrency(asset.balance)}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. FORM DE REGISTRO DE APORTE OU SAQUE */}
          {selectedCategory && (
            <form onSubmit={handleSaveMovement} className="p-4 bg-slate-50 dark-subcard rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                    {movementType === 'deposit' ? '+ Registrar Aporte em' : '- Registrar Resgate de'} {CATEGORY_METADATA[selectedCategory].label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Valor (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={amountStr}
                    onChange={e => setAmountStr(e.target.value.replace(/[^0-9,.]/g, ''))}
                    placeholder="0,00"
                    className="w-full px-3 py-2 text-base sm:text-xs font-mono-num font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-slate-100"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data do Aporte
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Instituição / Fundo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    placeholder="Ex: XP, Nubank, Itaú..."
                    className="w-full px-3 py-2 text-base sm:text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nota / Detalhes (Opcional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ex: Aporte mensal recorrente, cota 25/60..."
                  className="w-full px-3 py-2 text-base sm:text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white shadow-xs cursor-pointer ${
                    movementType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-500 dark-glow-emerald' : 'bg-rose-600 hover:bg-rose-500 dark-glow-rose'
                  }`}
                >
                  Confirmar {movementType === 'deposit' ? 'Aporte' : 'Resgate'}
                </button>
              </div>
            </form>
          )}

          {/* 3. OS 4 PILARES DE PATRIMÔNIO (CARDS EXECUTIVOS) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Subcategorias de Patrimônio
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categoriesList.map(type => {
                const asset = getAssetByType(type);
                const meta = CATEGORY_METADATA[type];
                const IconComponent = meta.icon;
                const isExpanded = expandedCat === type;

                return (
                  <div
                    key={type}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark-brushed-metal shadow-xs hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${meta.badgeClass} dark:bg-white/5 dark:border-white/10`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {meta.label}
                            </h4>
                            <p className="text-[10px] text-slate-400 line-clamp-1">
                              {meta.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenMovementForm(type, 'deposit')}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors text-xs font-semibold cursor-pointer dark-glow-emerald"
                            title="Novo Aporte"
                          >
                            + Aporte
                          </button>
                          <button
                            onClick={() => handleOpenMovementForm(type, 'withdraw')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Resgate"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Balance Display */}
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/10 flex items-baseline justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Saldo Acumulado:</span>
                        <span className="text-xl font-extrabold font-mono-num text-slate-900 dark:text-white">
                          {formatCurrency(asset.balance)}
                        </span>
                      </div>
                    </div>

                    {/* History Accordion Button */}
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{asset.history?.length || 0} lançamentos registrados</span>
                      <button
                        onClick={() => setExpandedCat(isExpanded ? null : type)}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        {isExpanded ? 'Ocultar Histórico' : 'Ver Histórico'}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Expanded History List */}
                    {isExpanded && (
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/10 space-y-2 animate-in fade-in">
                        {!asset.history || asset.history.length === 0 ? (
                          <div className="text-center py-3 text-xs text-slate-400">
                            Nenhum aporte registrado nesta subcategoria.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 dark:divide-white/[0.06] max-h-40 overflow-y-auto pr-1">
                            {asset.history.map(entry => (
                              <div key={entry.id} className="py-2 flex items-center justify-between text-xs">
                                <div>
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {entry.note || (entry.type === 'deposit' ? 'Aporte' : 'Resgate')}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {formatDateShort(entry.date)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono-num font-bold ${
                                    entry.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                  }`}>
                                    {entry.type === 'deposit' ? '+ ' : '- '} {formatCurrency(entry.amount)}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteEntry(type, entry.id)}
                                    className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                    title="Excluir movimentação"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
