import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BankConnection } from '../types';
import { 
  fetchPluggyConnectToken, 
  openPluggyConnectWidget, 
  fetchExistingPluggyItems, 
  fetchPluggyItemDetails, 
  requestDeletePluggyItem 
} from '../utils/pluggyClient';
import { formatDateReadable } from '../utils/formatters';

interface ConnectedBanksModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: BankConnection[];
  onSaveConnection: (connection: BankConnection) => Promise<void>;
  onDeleteConnection: (connectionId: string) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ConnectedBanksModal: React.FC<ConnectedBanksModalProps> = ({
  isOpen,
  onClose,
  connections,
  onSaveConnection,
  onDeleteConnection,
  showToast,
}) => {
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredItems, setDiscoveredItems] = useState<any[] | null>(null);
  const [manualItemId, setManualItemId] = useState('');
  const [isLinkingManual, setIsLinkingManual] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showManualSection, setShowManualSection] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Abrir Widget Oficial Pluggy Connect para Conectar Novo Banco
  const handleOpenConnectWidget = async (updateItemId?: string) => {
    setIsLoadingToken(true);
    setConfigError(null);
    try {
      const connectToken = await fetchPluggyConnectToken(updateItemId);
      setIsLoadingToken(false);

      await openPluggyConnectWidget({
        connectToken,
        updateItem: updateItemId,
        onSuccess: async (itemData: any) => {
          const item = itemData?.item;
          if (!item?.id) {
            showToast('Conexão finalizada, mas não foi possível identificar o item.', 'warning');
            return;
          }

          const institutionName = item.connector?.name || 'Banco Conectado';
          const newConnection: BankConnection = {
            id: item.id,
            itemId: item.id,
            institutionName,
            connectorId: item.connector?.id,
            connectorColor: item.connector?.primaryColor ? `#${item.connector.primaryColor.replace('#', '')}` : undefined,
            connectorImageUrl: item.connector?.imageUrl,
            status: item.status || 'UPDATED',
            createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
            updatedAt: Date.now(),
            lastSyncAt: Date.now(),
            error: item.error?.message || null,
          };

          await onSaveConnection(newConnection);
          showToast(`Conexão com ${institutionName} salva com sucesso!`);
        },
        onError: (err: any) => {
          console.error('Erro no widget Pluggy:', err);
          showToast('Houve um problema durante a conexão. Tente novamente.', 'error');
        },
      });
    } catch (err: any) {
      setIsLoadingToken(false);
      console.error('Erro ao iniciar widget Pluggy:', err);
      const msg = err.message || 'Falha ao inicializar o widget de conexão. Verifique as credenciais da Pluggy na Vercel.';
      if (msg.includes('PLUGGY') || msg.includes('variáveis') || msg.includes('autenticação') || msg.includes('Redeploy')) {
        setConfigError(msg);
      }
      showToast(msg, 'error');
    }
  };

  // 2. Descobrir automaticamente conexões já criadas na conta Pluggy
  const handleDiscoverExistingItems = async () => {
    setIsDiscovering(true);
    setDiscoveredItems(null);
    setConfigError(null);
    try {
      const items = await fetchExistingPluggyItems();
      setDiscoveredItems(items);
      if (items.length === 0) {
        showToast('Nenhuma conexão encontrada na sua aplicação da Pluggy.', 'info');
      } else {
        showToast(`${items.length} conexão(ões) encontrada(s) na Pluggy!`);
      }
    } catch (err: any) {
      console.error('Erro ao buscar conexões:', err);
      const msg = err.message || 'Não foi possível buscar as conexões na Pluggy.';
      if (msg.includes('PLUGGY') || msg.includes('variáveis') || msg.includes('autenticação') || msg.includes('Redeploy')) {
        setConfigError(msg);
      }
      showToast(msg, 'error');
    } finally {
      setIsDiscovering(false);
    }
  };

  // 3. Vincular item descoberto ao app
  const handleLinkDiscoveredItem = async (item: any) => {
    try {
      const institutionName = item.connector?.name || 'Banco Conectado';
      const conn: BankConnection = {
        id: item.id,
        itemId: item.id,
        institutionName,
        connectorId: item.connector?.id,
        connectorColor: item.connector?.primaryColor ? `#${item.connector.primaryColor.replace('#', '')}` : undefined,
        connectorImageUrl: item.connector?.imageUrl,
        status: item.status || 'UPDATED',
        createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
        updatedAt: Date.now(),
        lastSyncAt: Date.now(),
        error: item.error?.message || null,
      };

      await onSaveConnection(conn);
      showToast(`${institutionName} vinculado com sucesso ao seu Finance Pro!`);
    } catch (err: any) {
      showToast('Erro ao vincular conexão.', 'error');
    }
  };

  // 4. Vincular manualmente pelo Item ID informado
  const handleLinkManualItemId = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = manualItemId.trim();
    if (!cleanId) {
      showToast('Informe um Item ID válido.', 'warning');
      return;
    }

    setIsLinkingManual(true);
    try {
      const item = await fetchPluggyItemDetails(cleanId);
      const institutionName = item?.connector?.name || 'Banco Conectado';

      const conn: BankConnection = {
        id: item.id || cleanId,
        itemId: item.id || cleanId,
        institutionName,
        connectorId: item?.connector?.id,
        connectorColor: item?.connector?.primaryColor ? `#${item.connector.primaryColor.replace('#', '')}` : undefined,
        connectorImageUrl: item?.connector?.imageUrl,
        status: item?.status || 'UPDATED',
        createdAt: item?.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
        updatedAt: Date.now(),
        lastSyncAt: Date.now(),
        error: item?.error?.message || null,
      };

      await onSaveConnection(conn);
      setManualItemId('');
      showToast(`${institutionName} vinculado com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao vincular itemId:', err);
      showToast(err.message || 'Item ID não encontrado na Pluggy. Verifique o ID e suas credenciais.', 'error');
    } finally {
      setIsLinkingManual(false);
    }
  };

  // 5. Atualizar status de um item específico na Pluggy
  const handleRefreshItemStatus = async (itemId: string) => {
    setUpdatingItemId(itemId);
    try {
      const item = await fetchPluggyItemDetails(itemId);
      const existing = connections.find(c => c.itemId === itemId);
      if (existing) {
        const updated: BankConnection = {
          ...existing,
          status: item.status || existing.status,
          updatedAt: Date.now(),
          lastSyncAt: Date.now(),
          error: item.error?.message || null,
        };
        await onSaveConnection(updated);
        showToast(`Status de ${existing.institutionName} atualizado: ${item.status || 'OK'}`);
      }
    } catch (err: any) {
      showToast('Não foi possível atualizar o status agora.', 'warning');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // 6. Excluir conexão
  const handleDelete = async (conn: BankConnection) => {
    if (!window.confirm(`Deseja realmente desconectar ${conn.institutionName}?`)) {
      return;
    }

    try {
      // Tenta remover na Pluggy (se falhar, remove do app mesmo assim)
      try {
        await requestDeletePluggyItem(conn.itemId);
      } catch (err) {
        console.warn('Erro ao deletar item na Pluggy:', err);
      }

      await onDeleteConnection(conn.id);
      showToast(`${conn.institutionName} desconectado com sucesso.`);
    } catch (err) {
      showToast('Erro ao remover conexão bancária.', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Item ID copiado para a área de transferência', 'info');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'UPDATED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Conectado
          </span>
        );
      case 'UPDATING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
            <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
            Sincronizando
          </span>
        );
      case 'WAITING_USER_INPUT':
      case 'LOGIN_ERROR':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3 text-rose-500" />
            Ação Necessária
          </span>
        );
      case 'OUTDATED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <Clock className="w-3 h-3" />
            Consentimento Expirado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-connected-banks"
        className="bg-white dark:bg-[#161619] rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs dark:shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Bancos Conectados
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> Open Finance
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Integração oficial via Pluggy com Nubank, Santander e outros bancos
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Config Error Banner */}
          {configError && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-300 text-sm">Atenção com as Variáveis na Vercel</p>
                  <p className="text-slate-300 leading-relaxed">{configError}</p>
                  <div className="pt-2 text-[11px] text-slate-400 border-t border-amber-500/20 mt-2 space-y-1">
                    <p className="font-semibold text-slate-200">Como resolver:</p>
                    <p>1. No dashboard da <b>Vercel &gt; Settings &gt; Environment Variables</b>, certifique-se de que <code>PLUGGY_CLIENT_ID</code> e <code>PLUGGY_CLIENT_SECRET</code> foram salvas com o ambiente <b>Production</b> marcado.</p>
                    <p>2. Na aba <b>Deployments</b> da Vercel, acione um <b>Redeploy</b> (ou envie um novo deploy) para que as funções serverless leiam as novas variáveis.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Header Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Conectar Novo Banco ou Cartão
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md">
                Abra o fluxo oficial seguro do Open Finance para conectar contas e cartões com consentimento bancário.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenConnectWidget()}
              disabled={isLoadingToken}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-md dark:shadow-[0_0_20px_-3px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoadingToken ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Iniciando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>+ Conectar Banco</span>
                </>
              )}
            </button>
          </div>

          {/* Section: Active Connections List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Conexões Ativas ({connections.length})
              </h3>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Salvo em /users/uid/bankConnections
              </span>
            </div>

            {connections.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-center space-y-3 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="max-w-sm mx-auto">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Nenhum banco conectado ainda
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Conecte seu Nubank ou Santander pelo botão acima ou vincule suas conexões já existentes do Meu Pluggy abaixo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {connections.map(conn => {
                  const isUpdating = updatingItemId === conn.itemId;
                  return (
                    <div
                      key={conn.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1e] hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Bank info */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs border"
                          style={{
                            backgroundColor: conn.connectorColor ? `${conn.connectorColor}20` : '#05966920',
                            borderColor: conn.connectorColor ? `${conn.connectorColor}40` : '#05966940',
                            color: conn.connectorColor || '#059669',
                          }}
                        >
                          {conn.connectorImageUrl ? (
                            <img 
                              src={conn.connectorImageUrl} 
                              alt={conn.institutionName} 
                              className="w-6 h-6 object-contain rounded-md"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            conn.institutionName.charAt(0)
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {conn.institutionName}
                            </span>
                            {getStatusBadge(conn.status)}
                          </div>
                          
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>Conectado em: {formatDateReadable(new Date(conn.createdAt).toISOString().split('T')[0])}</span>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              ID: {conn.itemId.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(conn.itemId)}
                          title="Copiar Item ID completo"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          {copiedId === conn.itemId ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRefreshItemStatus(conn.itemId)}
                          disabled={isUpdating}
                          title="Atualizar status na Pluggy"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin text-emerald-500' : ''}`} />
                        </button>

                        {/* Botão de reconectar caso precise de login */}
                        {(conn.status === 'WAITING_USER_INPUT' || conn.status === 'LOGIN_ERROR' || conn.status === 'OUTDATED') && (
                          <button
                            type="button"
                            onClick={() => handleOpenConnectWidget(conn.itemId)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                          >
                            Reconectar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(conn)}
                          title="Desconectar banco"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Vincular Conexões Já Existentes do Meu Pluggy */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-emerald-500" />
                  Vincular Conexões Já Existentes do "Meu Pluggy"
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Como você já conectou Nubank e Santander anteriormente, resgate-os com um clique.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDiscoverExistingItems}
                disabled={isDiscovering}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                <span>{isDiscovering ? 'Buscando...' : 'Buscar na Pluggy'}</span>
              </button>
            </div>

            {/* Resultado da busca automática */}
            {discoveredItems && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-2">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Itens encontrados na sua aplicação:
                </span>
                
                {discoveredItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhum item listado via API. Você pode vincular colando o Item ID manualmente abaixo.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {discoveredItems.map(item => {
                      const isAlreadyLinked = connections.some(c => c.itemId === item.id);
                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1e] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.connector?.name || 'Conexão Pluggy'}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              ({item.id.slice(0, 8)}...)
                            </span>
                            {getStatusBadge(item.status)}
                          </div>

                          {isAlreadyLinked ? (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Vinculado
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLinkDiscoveredItem(item)}
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer"
                            >
                              Vincular ao App
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Alternância para vincular por Item ID Manual */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowManualSection(!showManualSection)}
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{showManualSection ? 'Ocultar campo de Item ID manual' : 'Ou colar Item ID manualmente'}</span>
                {showManualSection ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showManualSection && (
                <form onSubmit={handleLinkManualItemId} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={manualItemId}
                    onChange={(e) => setManualItemId(e.target.value)}
                    placeholder="Cole o itemId da Pluggy (ex: c1f7b7f1-79b8-4c12-...)"
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <button
                    type="submit"
                    disabled={isLinkingManual || !manualItemId.trim()}
                    className="px-3 py-2 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                  >
                    {isLinkingManual ? 'Validando...' : 'Vincular ID'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Dica da Próxima Etapa */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <span className="text-emerald-500 font-bold shrink-0">Etapa 1 Concluída:</span>
            <span>
              Suas conexões salvas aqui em <code>/users/uid/bankConnections</code> serão utilizadas na <strong>Etapa 2</strong> para sincronizar e importar as transações de cartão e débito do Nubank e Santander.
            </span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-black/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
