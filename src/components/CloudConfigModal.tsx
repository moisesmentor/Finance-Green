import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  Database, 
  Check, 
  Copy, 
  RefreshCw, 
  ArrowUp, 
  ArrowDown, 
  AlertCircle, 
  CheckCircle2, 
  Code2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { CloudConfig, Transaction, CategoryBudget, FinancialGoal } from '../types';
import { 
  testSupabaseConnection, 
  pushToSupabase, 
  pullFromSupabase, 
  getSupabaseTableSchemaSQL 
} from '../utils/cloudSync';

interface CloudConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudConfig: CloudConfig;
  onSaveCloudConfig: (config: CloudConfig) => void;
  transactions: Transaction[];
  budgets: CategoryBudget[];
  goals: FinancialGoal[];
  onApplyCloudData: (transactions: Transaction[], budgets: CategoryBudget[], goals: FinancialGoal[]) => void;
}

export const CloudConfigModal: React.FC<CloudConfigModalProps> = ({
  isOpen,
  onClose,
  cloudConfig,
  onSaveCloudConfig,
  transactions,
  budgets,
  goals,
  onApplyCloudData,
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState(cloudConfig.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(cloudConfig.supabaseAnonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSQL, setCopiedSQL] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setTestResult({ success: false, message: 'Preencha a URL e a Chave Anon do Supabase.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      onSaveCloudConfig({
        enabled: true,
        provider: 'supabase',
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
        lastSyncedAt: new Date().toISOString(),
      });
    }
  };

  const handlePush = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setTestResult({ success: false, message: 'Configure as credenciais primeiro.' });
      return;
    }

    setIsSyncing(true);
    const res = await pushToSupabase(supabaseUrl, supabaseAnonKey, { transactions, budgets, goals });
    setIsSyncing(false);
    setTestResult(res);

    if (res.success) {
      onSaveCloudConfig({
        ...cloudConfig,
        enabled: true,
        supabaseUrl,
        supabaseAnonKey,
        lastSyncedAt: new Date().toISOString(),
      });
    }
  };

  const handlePull = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setTestResult({ success: false, message: 'Configure as credenciais primeiro.' });
      return;
    }

    setIsSyncing(true);
    const res = await pullFromSupabase(supabaseUrl, supabaseAnonKey);
    setIsSyncing(false);

    if (res.success && res.data) {
      if (window.confirm('Substituir os dados atuais pelos dados da nuvem?')) {
        onApplyCloudData(res.data.transactions, res.data.budgets, res.data.goals);
        setTestResult({ success: true, message: 'Dados da nuvem aplicados com sucesso!' });
      }
    } else {
      setTestResult({ success: false, message: res.message });
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(getSupabaseTableSchemaSQL());
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-cloud-config"
        className="bg-white dark-brushed-metal-modal rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 dark-glow-emerald">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Sincronização em Nuvem (Supabase)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acesse seus dados em múltiplos dispositivos com banco de dados seguro
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Offline First notice */}
          <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold mb-0.5">Arquitetura Offline-First</strong>
              Mesmo sem configurar a nuvem, todas as suas finanças continuam salvas no seu navegador com total privacidade.
            </div>
          </div>

          {testResult && (
            <div className={`p-3 text-xs rounded-lg flex items-start gap-2 ${
              testResult.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Form */}
          <div className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Supabase Project URL
                </label>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Criar conta grátis no Supabase <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="text"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzproject.supabase.co"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supabase Anon Public Key
              </label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={e => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs dark-glow-emerald transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Testando...' : 'Testar & Conectar'}
              </button>

              <button
                type="button"
                onClick={handlePush}
                disabled={isSyncing}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Enviar dados deste dispositivo para a nuvem"
              >
                <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Fazer Upload
              </button>

              <button
                type="button"
                onClick={handlePull}
                disabled={isSyncing}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Puxar dados mais recentes da nuvem"
              >
                <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Baixar da Nuvem
              </button>
            </div>
          </div>

          {/* SQL Setup Helper */}
          <div className="p-4 bg-slate-50 dark-subcard rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Script SQL para criar as tabelas
              </span>
              <button
                onClick={handleCopySQL}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedSQL ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar SQL
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              No painel do Supabase, clique em <strong>SQL Editor</strong>, cole o código e clique em <strong>Run</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
