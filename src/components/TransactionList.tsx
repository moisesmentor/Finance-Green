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
  Inbox
} from 'lucide-react';
import { Transaction, FilterOptions, Category } from '../types';
import { CATEGORIES, PAYMENT_METHODS } from '../utils/constants';
import { formatCurrency, formatDateReadable } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onAddNew: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddNew,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Category map for fast lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of CATEGORIES) {
      map.set(c.id, c);
    }
    return map;
  }, []);

  // Payment method map for fast lookup
  const paymentMethodMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const pm of PAYMENT_METHODS) {
      map.set(pm.id, pm.label);
    }
    return map;
  }, []);

  // Filtered & Sorted transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(tx => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;
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
  }, [transactions, typeFilter, statusFilter, categoryFilter, search, sortBy, categoryMap]);

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
    setTypeFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSortBy('date_desc');
  };

  const hasActiveFilters = search || typeFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'date_desc';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Header & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Extrato & Lançamentos
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {filteredTransactions.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Visualize, filtre e gerencie todas as transações deste mês
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por descrição ou nota..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white text-slate-700"
            >
              <option value="all">Tipo: Todos</option>
              <option value="expense">Apenas Despesas</option>
              <option value="income">Apenas Receitas</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white text-slate-700"
            >
              <option value="all">Categoria: Todas</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status & Sort */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white text-slate-700"
            >
              <option value="all">Status: Todos</option>
              <option value="paid">Pagos</option>
              <option value="pending">Pendentes</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors bg-white text-slate-700"
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
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Filtro ativo: {filteredTransactions.length} resultado(s) encontrado(s)
            </span>
            <button
              onClick={resetFilters}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Transaction Rows */}
      {filteredTransactions.length === 0 ? (
        <div className="py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700 mb-1">
            Nenhuma transação encontrada
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {hasActiveFilters
              ? 'Tente ajustar os termos de busca ou filtros selecionados.'
              : 'Você ainda não registrou nenhum gasto ou receita para este mês.'}
          </p>
          <button
            onClick={hasActiveFilters ? resetFilters : onAddNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
          >
            {hasActiveFilters ? 'Limpar Filtros' : 'Adicionar Transação'}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
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

            return (
              <div
                key={tx.id}
                id={`tx-row-${tx.id}`}
                className="p-3.5 sm:px-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Left Side: Icon & Details */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cat.bgLight}`}
                  >
                    <CategoryIcon name={cat.icon} className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {tx.description}
                      </span>

                      {tx.isRecurring && (
                        <span 
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                          title="Gasto mensal fixo / recorrente"
                        >
                          <Repeat className="w-2.5 h-2.5 text-slate-500" />
                          Fixo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span className="font-medium text-slate-600">{cat.name}</span>
                      <span>•</span>
                      <span>{paymentMethodMap.get(tx.paymentMethod) || tx.paymentMethod}</span>
                      <span>•</span>
                      <span>{formatDateReadable(tx.date)}</span>
                    </div>

                    {tx.notes && (
                      <p className="text-[11px] text-slate-400 italic mt-0.5 truncate max-w-md">
                        Nota: {tx.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side: Status Badge, Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  
                  {/* Status clickable toggle */}
                  <button
                    onClick={() => onToggleStatus(tx.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    }`}
                    title="Clique para alternar entre Pago e Pendente"
                  >
                    {isPaid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{isIncome ? 'Recebido' : 'Pago'}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{isIncome ? 'A receber' : 'Pendente'}</span>
                      </>
                    )}
                  </button>

                  {/* Value */}
                  <div
                    className={`text-sm sm:text-base font-bold font-mono-num ${
                      isIncome ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                  </div>

                  {/* Edit / Delete Buttons */}
                  <div className="flex items-center gap-1 sm:opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(tx.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Excluir"
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
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            Mostrando <strong>{filteredTransactions.length}</strong> de {transactions.length} transações
          </div>
          <div className="flex items-center gap-4 font-mono-num">
            {filteredTotal.income > 0 && (
              <span className="text-emerald-700 font-semibold">
                Receitas: +{formatCurrency(filteredTotal.income)}
              </span>
            )}
            {filteredTotal.expense > 0 && (
              <span className="text-rose-600 font-semibold">
                Despesas: -{formatCurrency(filteredTotal.expense)}
              </span>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
