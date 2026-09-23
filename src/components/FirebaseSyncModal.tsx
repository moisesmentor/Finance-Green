import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Smartphone, 
  Laptop, 
  QrCode, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Cloud, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Key
} from 'lucide-react';
import { 
  FirebaseConfig, 
  FirebaseSyncSettings, 
  FirebaseSyncStatus, 
  Transaction, 
  CategoryBudget, 
  FinancialGoal 
} from '../types';
import { 
  parseFirebaseConfigInput, 
  testFirebaseConnection, 
  pushWorkspaceData, 
  fetchWorkspaceData, 
  getMobilePairingUrl, 
  FIRESTORE_RULES_GUIDE 
} from '../utils/firebase';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FirebaseSyncSettings;
  onSaveSettings: (settings: FirebaseSyncSettings) => void;
  syncStatus: FirebaseSyncStatus;
  localTransactions: Transaction[];
  localBudgets: CategoryBudget[];
  localGoals: FinancialGoal[];
  onApplyCloudData: (transactions: Transaction[], budgets: CategoryBudget[], goals: FinancialGoal[]) => void;
}

export function FirebaseSyncModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  syncStatus,
  localTransactions,
  localBudgets,
  localGoals,
  onApplyCloudData,
}: FirebaseSyncModalProps) {
  const [activeTab, setActiveTab] = useState<'pair' | 'config' | 'actions'>('pair');

  // Chave de sincronização
  const [syncKeyInput, setSyncKeyInput] = useState(settings.syncKey || 'FIN-MOISES');
  
  // Colar configuração bruta do Firebase
  const [rawConfigInput, setRawConfigInput] = useState(() => {
    return settings.config ? JSON.stringify(settings.config, null, 2) : '';
  });

  // Campos individuais opcionais
  const [apiKey, setApiKey] = useState(settings.config?.apiKey || '');
  const [projectId, setProjectId] = useState(settings.config?.projectId || '');
  const [appId, setAppId] = useState(settings.config?.appId || '');

  // Estados de feedback visual
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Canvas para renderizar o QR Code
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const pairingUrl = getMobilePairingUrl(syncKeyInput);

  // Renderizar o QR Code quando a URL mudar ou ao abrir o modal
  useEffect(() => {
    if (!isOpen || activeTab !== 'pair' || !qrCanvasRef.current || !pairingUrl) return;

    QRCode.toCanvas(
      qrCanvasRef.current,
      pairingUrl,
      {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (error) => {
        if (error) console.error('Erro ao gerar QR Code:', error);
      }
    );
  }, [isOpen, activeTab, pairingUrl]);

  // Atualizar inputs caso as settings mudem externamente
  useEffect(() => {
    setSyncKeyInput(settings.syncKey || 'FIN-MOISES');
    if (settings.config) {
      setApiKey(settings.config.apiKey || '');
      setProjectId(settings.config.projectId || '');
      setAppId(settings.config.appId || '');
      setRawConfigInput(JSON.stringify(settings.config, null, 2));
    }
  }, [settings]);

  if (!isOpen) return null;

  // Lidar com colagem de configuração bruta (const firebaseConfig = { ... })
  const handleParseRawConfig = (text: string) => {
    setRawConfigInput(text);
    const parsed = parseFirebaseConfigInput(text);
    if (parsed) {
      setApiKey(parsed.apiKey);
      setProjectId(parsed.projectId);
      setAppId(parsed.appId || '');
      setTestResult({ success: true, message: `Configuração detectada: Projeto "${parsed.projectId}" pronto!` });
    }
  };

  // Salvar configurações
  const handleSaveConfig = () => {
    let finalConfig: FirebaseConfig | null = null;

    if (rawConfigInput.trim()) {
      finalConfig = parseFirebaseConfigInput(rawConfigInput);
    }

    if (!finalConfig && apiKey && projectId) {
      finalConfig = {
        apiKey: apiKey.trim(),
        projectId: projectId.trim(),
        appId: appId.trim(),
        authDomain: `${projectId.trim()}.firebaseapp.com`,
        storageBucket: `${projectId.trim()}.appspot.com`,
      };
    }

    const updatedSettings: FirebaseSyncSettings = {
      ...settings,
      enabled: !!finalConfig,
      syncKey: syncKeyInput.trim().toUpperCase() || 'FIN-MOISES',
      config: finalConfig,
    };

    onSaveSettings(updatedSettings);
    setActionSuccessMsg('Configurações salvas com sucesso!');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Testar conexão
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    let configToTest = settings.config;
    if (rawConfigInput.trim()) {
      const parsed = parseFirebaseConfigInput(rawConfigInput);
      if (parsed) configToTest = parsed;
    } else if (apiKey && projectId) {
      configToTest = {
        apiKey: apiKey.trim(),
        projectId: projectId.trim(),
        appId: appId.trim(),
      };
    }

    if (!configToTest) {
      setTestResult({
        success: false,
        message: 'Preencha a chave de API e o Project ID do Firebase primeiro.',
      });
      setIsTesting(false);
      return;
    }

    const res = await testFirebaseConnection(configToTest, syncKeyInput);
    setTestResult(res);
    setIsTesting(false);
  };

  // Enviar dados locais para o Firestore
  const handlePushLocalData = async () => {
    if (!settings.config) {
      alert('Configure o Firebase primeiro na aba "Configurar Firebase"!');
      return;
    }

    setIsPushing(true);
    const res = await pushWorkspaceData(settings.config, settings.syncKey, {
      transactions: localTransactions,
      budgets: localBudgets,
      goals: localGoals,
    });
    setIsPushing(false);

    if (res.success) {
      setActionSuccessMsg(`${localTransactions.length} receitas/despesas enviadas com sucesso para a nuvem!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } else {
      alert(`Erro ao enviar: ${res.error}`);
    }
  };

  // Puxar dados da nuvem
  const handlePullRemoteData = async () => {
    if (!settings.config) {
      alert('Configure o Firebase primeiro na aba "Configurar Firebase"!');
      return;
    }

    if (!confirm('Deseja substituir os dados locais pelos dados salvos no Firebase?')) {
      return;
    }

    setIsPulling(true);
    const res = await fetchWorkspaceData(settings.config, settings.syncKey);
    setIsPulling(false);

    if (res.success && res.data) {
      onApplyCloudData(res.data.transactions, res.data.budgets, res.data.goals);
      setActionSuccessMsg('Dados sincronizados da nuvem com sucesso!');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } else if (res.success && !res.data) {
      alert('Nenhum dado encontrado para esta chave no Firebase. Envie os dados locais primeiro!');
    } else {
      alert(`Erro ao puxar dados: ${res.error}`);
    }
  };

  // Copiar link de pareamento
  const handleCopyPairingUrl = () => {
    navigator.clipboard.writeText(pairingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Copiar regras de segurança
  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_GUIDE);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Sincronização em Tempo Real (Firebase)
                </h3>
                {syncStatus === 'connected' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Desktop ↔ Celular sincronizados instantaneamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-3 gap-2 bg-slate-50/30 dark:bg-slate-900/30">
          <button
            onClick={() => setActiveTab('pair')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'pair'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Conectar Celular (QR Code)</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Configurar Firebase</span>
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'actions'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Backup & Operações</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* Feedback messages */}
          {actionSuccessMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: PAIR MOBILE VIA QR CODE */}
          {activeTab === 'pair' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-200/70 dark:border-emerald-800/40 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6">
                
                {/* QR Code Container */}
                <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200/80 shrink-0 flex flex-col items-center">
                  <canvas ref={qrCanvasRef} className="rounded-lg" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-2 flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-emerald-600" /> Escaneie no celular
                  </span>
                </div>

                {/* Explanation & Instructions */}
                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3" /> Emparelhamento Instantâneo
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Abra a câmera do seu celular
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Aponte a câmera do seu iPhone ou Android para o QR Code ao lado. O aplicativo abrirá no seu navegador mobile já conectado à sua conta com a mesma chave!
                  </p>

                  <div className="pt-1 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleCopyPairingUrl}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link para Celular'}</span>
                    </button>
                    <a
                      href={pairingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer no-underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir em Nova Aba</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Chave de Sincronização */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    Sua Chave de Sincronização (Código da Conta):
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">Compartilhada entre seus aparelhos</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={syncKeyInput}
                    onChange={(e) => setSyncKeyInput(e.target.value.toUpperCase())}
                    placeholder="Ex: FIN-MOISES ou seu e-mail"
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleSaveConfig}
                    className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Salvar Chave
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Qualquer celular ou computador com esta mesma chave receberá as atualizações em tempo real assim que você adicionar uma receita ou despesa.
                </p>
              </div>

              {/* Comparativo de status */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Desktop Atual</span>
                    <span className="text-[10px] text-emerald-600 font-medium">● Conectado à chave</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Celular (Mobile)</span>
                    <span className="text-[10px] text-slate-500 font-medium">Escaneie o QR Code para conectar</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONFIGURAR FIREBASE */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Opção Rápida: Colar Objeto Completo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Colar Código de Configuração do Firebase:
                  </label>
                  <span className="text-[11px] text-slate-400">Suporta JSON ou código JavaScript</span>
                </div>
                <textarea
                  rows={4}
                  value={rawConfigInput}
                  onChange={(e) => handleParseRawConfig(e.target.value)}
                  placeholder={`Cole aqui o código copiado do Firebase, ex:\nconst firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "seu-projeto",\n  appId: "1:123..."\n};`}
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Campos individuais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Project ID:
                  </label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="ex: finance-app-12345"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    API Key:
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Salvar Configuração
                </button>

                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testando Conexão...' : 'Testar Conexão com Firestore'}</span>
                </button>
              </div>

              {/* Test Result Alert */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">{testResult.success ? 'Tudo Certo!' : 'Atenção:'} </span>
                    {testResult.message}
                  </div>
                </div>
              )}

              {/* Guia Rápido de Criação no Firebase */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-orange-500" />
                    Como criar o banco no Firebase em 2 minutos (100% Gratuito):
                  </h5>
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Abrir Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside">
                  <li>Acesse o console do Firebase e clique em <b>"Adicionar projeto"</b>.</li>
                  <li>No menu esquerdo, vá em <b>Build (Criação) &gt; Firestore Database</b> e clique em <b>Criar banco de dados</b>.</li>
                  <li>
                    Na aba <b>Regras (Rules)</b> do Firestore, cole as regras abaixo para liberar a sincronização:
                    <div className="relative mt-1">
                      <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto">
                        {FIRESTORE_RULES_GUIDE}
                      </pre>
                      <button
                        onClick={handleCopyRules}
                        className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold transition-all flex items-center gap-1"
                      >
                        {copiedRules ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedRules ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </li>
                  <li>Vá em <b>Configurações do Projeto (ícone de engrenagem) &gt; Seus apps &gt; Web (&lt;/&gt;)</b>, copie o objeto <code className="text-emerald-600">firebaseConfig</code> e cole na caixa acima!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP & OPERAÇÕES */}
          {activeTab === 'actions' && (
            <div className="space-y-5">
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-600" />
                  Sincronização Manual de Dados
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Você pode enviar todas as suas receitas, despesas, parcelamentos e metas que já estão cadastradas localmente neste computador diretamente para o banco de dados do Firebase.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handlePushLocalData}
                    disabled={isPushing}
                    className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-left transition-all cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Enviar Dados Locais para Nuvem</span>
                      <RefreshCw className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                      Envia {localTransactions.length} transações e {localGoals.length} metas para o Firebase.
                    </span>
                  </button>

                  <button
                    onClick={handlePullRemoteData}
                    disabled={isPulling}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-left transition-all cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Recarregar Dados da Nuvem</span>
                      <Cloud className={`w-3.5 h-3.5 ${isPulling ? 'animate-bounce' : ''}`} />
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Puxa o banco completo do Firebase para este dispositivo.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Dados criptografados na transmissão SSL/TLS</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
