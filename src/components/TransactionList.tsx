import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Repeat,
  Sparkles,
  Inbox,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  X,
  CreditCard,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { Transaction, FilterOptions, Category } from '../types';
import { CATEGORIES, PAYMENT_METHODS } from '../utils/constants';
import { formatCurrency, formatDateReadable, getDueDateStatus } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onToggleStatus: (id: string) => void;
  onAddNew: () => void;
  categories?: Category[];
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
  onDeleteGroup,
  onToggleStatus,
  onAddNew,
  categories,
}) => {
  const [search, setSearch] = useState('');
  const [quickTab, setQuickTab] = useState<'all' | 'expense' | 'income' | 'pending' | 'installments'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  const activeCategories = useMemo(() => categories || CATEGORIES, [categories]);

  // Category map for fast lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of activeCategories) {
      map.set(c.id, c);
    }
    return map;
  }, [activeCategories]);

  // Payment method map for fast lookup
  const paymentMethodMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const pm of PAYMENT_METHODS) {
      map.set(pm.id, pm.label);
    }
    return map;
  }, []);

  // Quick counts
  const counts = useMemo(() => {
    let expense = 0;
    let income = 0;
    let pending = 0;
    let installments = 0;

    for (const t of transactions) {
      if (t.type === 'expense') expense++;
      if (t.type === 'income') income++;
      if (t.status === 'pending') pending++;
      if (t.installmentTotal && t.installmentTotal > 1) installments++;
    }

    return { all: transactions.length, expense, income, pending, installments };
  }, [transactions]);

  // Filtered & Sorted transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(tx => {
        // Quick tab filter
        if (quickTab === 'expense' && tx.type !== 'expense') return false;
        if (quickTab === 'income' && tx.type !== 'income') return false;
        if (quickTab === 'pending' && tx.status !== 'pending') return false;
        if (quickTab === 'installments' && (!tx.installmentTotal || tx.installmentTotal <= 1)) return false;

        // Category filter
        if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchDesc = tx.description.toLowerCase().includes(q);
          const matchNotes = tx.notes ? tx.notes.toLowerCase().includes(q) : false;
          const matchCat = categoryMap.get(tx.categoryId)?.name.toLowerCase().includes(q);
          if (!matchDesc && !matchNotes && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
        }
        if (sortBy === 'date_asc') {
          return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
        }
        if (sortBy === 'amount_desc') {
          return b.amount - a.amount;
        }
        if (sortBy === 'amount_asc') {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [transactions, quickTab, categoryFilter, search, sortBy, categoryMap]);

  // Subtotal for currently filtered items
  const filteredTotal = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const resetFilters = () => {
    setSearch('');
    setQuickTab('all');
    setCategoryFilter('all');
    setSortBy('date_desc');
  };

  const handleDeleteItem = (tx: Transaction) => {
    if (tx.installmentGroupId && tx.installmentTotal && onDeleteGroup) {
      const choice = window.confirm(
        `Esta transação faz parte de um parcelamento (${tx.installmentCurrent}/${tx.installmentTotal}).\n\nClique em OK para excluir TODAS as parcelas deste grupo, ou Cancelar para excluir somente este mês.`
      );
      if (choice) {
        onDeleteGroup(tx.installmentGroupId);
        return;
      }
    }
    onDelete(tx.id);
  };

  const hasActiveFilters = search || quickTab !== 'all' || categoryFilter !== 'all' || sortBy !== 'date_desc';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs dark:shadow-2xl overflow-hidden transition-all duration-300">
      
      {/* Header & Filter Controls */}
      <div className="p-5 border-b border-slate-100 dark:border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
              Extrato & Movimentações
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono-num border border-slate-200/60 dark:border-slate-700/60">
                {filteredTransactions.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Histórico detalhado das entradas e saídas deste período
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Lançamento
            </button>
          </div>
        </div>

        {/* Modern Segmented Quick Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'Todas', count: counts.all },
            { id: 'expense', label: 'Despesas', count: counts.expense },
            { id: 'income', label: 'Receitas', count: counts.income },
            { id: 'pending', label: 'Pendentes', count: counts.pending },
            { id: 'installments', label: 'Parceladas', count: counts.installments },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setQuickTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                quickTab === tab.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                quickTab === tab.id 
                  ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900' 
                  : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Secondary Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por descrição, categoria ou nota..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category & Order Controls */}
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors cursor-pointer"
            >
              <option value="all">Categorias: Todas</option>
              {activeCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.isCustom ? `⭐ ${cat.name}` : cat.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors cursor-pointer"
            >
              <option value="date_desc">Mais novos</option>
              <option value="date_asc">Mais antigos</option>
              <option value="amount_desc">Maior valor</option>
              <option value="amount_asc">Menor valor</option>
            </select>
          </div>
        </div>

        {/* Filter status row */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>
              Filtro ativo: <strong>{filteredTransactions.length}</strong> resultado(s)
            </span>
            <button
              onClick={resetFilters}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Transaction Rows */}
      {filteredTransactions.length === 0 ? (
        <div className="py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            Nenhuma transação encontrada
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            {hasActiveFilters
              ? 'Nenhum lançamento corresponde aos filtros selecionados.'
              : 'Você ainda não registrou nenhum gasto ou receita para este período.'}
          </p>
          <button
            onClick={hasActiveFilters ? resetFilters : onAddNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            {hasActiveFilters ? 'Limpar Filtros' : 'Adicionar Transação'}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredTransactions.map(tx => {
            const cat = categoryMap.get(tx.categoryId) || {
              id: 'outros',
              name: 'Geral',
              icon: 'MoreHorizontal',
              color: '#64748b',
              bgLight: 'bg-slate-100 text-slate-700 border-slate-200',
              textColor: 'text-slate-700',
              type: 'both' as const,
            };

            const isIncome = tx.type === 'income';
            const isPaid = tx.status === 'paid';
            const dueStatus = (!isPaid && !isIncome) ? getDueDateStatus(tx.date) : null;

            return (
              <div
                key={tx.id}
                id={`tx-row-${tx.id}`}
                className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Left Side: Icon & Details */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs"
                    style={{
                      backgroundColor: `${cat.color}15`,
                      borderColor: `${cat.color}30`,
                      color: cat.color
                    }}
                  >
                    <CategoryIcon name={cat.icon} className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight">
                        {tx.description}
                      </span>

                      {/* Installment Badge */}
                      {tx.installmentTotal && tx.installmentTotal > 1 && (
                        <span 
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800"
                          title={`${tx.type === 'income' ? 'Receita parcelada' : 'Lançamento parcelado'} (${tx.installmentCurrent}/${tx.installmentTotal})`}
                        >
                          <Layers className="w-2.5 h-2.5 text-indigo-500" />
                          {tx.installmentCurrent}/{tx.installmentTotal}
                        </span>
                      )}

                      {/* Recurrent Badge */}
                      {tx.isRecurring && (
                        <span 
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          title="Gasto mensal fixo / recorrente"
                        >
                          <Repeat className="w-2.5 h-2.5 text-slate-500" />
                          Fixo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap font-medium">
                      <span className="text-slate-700 dark:text-slate-300">{cat.name}</span>
                      <span>•</span>
                      <span>{paymentMethodMap.get(tx.paymentMethod) || tx.paymentMethod}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDateReadable(tx.date)}
                      </span>
                    </div>

                    {tx.notes && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5 truncate max-w-md">
                        Nota: {tx.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side: Status Toggle, Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  
                  {/* Status Clickable Toggle Pill with Smart Due Alert Badges */}
                  <button
                    onClick={() => onToggleStatus(tx.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                      isPaid
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        : dueStatus?.urgency === 'overdue'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                          : dueStatus?.urgency === 'today'
                            ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                    }`}
                    title={
                      isPaid 
                        ? 'Marcado como pago (Clique para marcar pendente)' 
                        : dueStatus?.label 
                          ? `${dueStatus.label} (Clique para marcar como pago)` 
                          : 'Clique para alternar entre Pago e Pendente'
                    }
                  >
                    {isPaid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{isIncome ? 'Recebido' : 'Pago'}</span>
                      </>
                    ) : dueStatus?.urgency === 'overdue' ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        <span>{dueStatus.label}</span>
                      </>
                    ) : dueStatus?.urgency === 'today' ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                        <span>Vence Hoje</span>
                      </>
                    ) : dueStatus?.urgency === 'upcoming' ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>{dueStatus.label}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>{isIncome ? 'A receber' : 'Pendente'}</span>
                      </>
                    )}
                  </button>

                  {/* Value */}
                  <div
                    className={`text-sm sm:text-base font-extrabold font-mono-num ${
                      isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                  </div>

                  {/* Quick Actions (Edit & Delete) */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(tx)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Editar lançamento"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(tx)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                      title="Excluir lançamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Footer Subtotal */}
      {filteredTransactions.length > 0 && (
        <div className="bg-slate-50/90 dark:bg-slate-800/80 px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors">
          <div>
            Exibindo <strong>{filteredTransactions.length}</strong> de {transactions.length} lançamentos
          </div>
          <div className="flex items-center gap-5 font-mono-num font-bold text-xs sm:text-sm">
            {filteredTotal.income > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ArrowDownLeft className="w-4 h-4" /> +{formatCurrency(filteredTotal.income)}
              </span>
            )}
            {filteredTotal.expense > 0 && (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" /> -{formatCurrency(filteredTotal.expense)}
              </span>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
