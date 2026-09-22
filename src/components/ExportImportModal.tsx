import React, { useRef, useState } from 'react';
import { X, Download, Upload, RotateCcw, Trash2, CheckCircle2, AlertTriangle, FileJson } from 'lucide-react';
import { Transaction, CategoryBudget, FinancialGoal } from '../types';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  budgets: CategoryBudget[];
  goals: FinancialGoal[];
  onImportData: (transactions: Transaction[], budgets: CategoryBudget[], goals?: FinancialGoal[]) => void;
  onResetToSample: () => void;
  onClearAll: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  budgets,
  goals,
  onImportData,
  onResetToSample,
  onClearAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    try {
      const exportObject = {
        version: 2,
        exportedAt: new Date().toISOString(),
        transactions,
        budgets,
        goals,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `financas_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg('Backup exportado com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg('Falha ao exportar backup.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (Array.isArray(parsed.transactions)) {
          onImportData(
            parsed.transactions, 
            Array.isArray(parsed.budgets) ? parsed.budgets : [],
            Array.isArray(parsed.goals) ? parsed.goals : undefined
          );
          setSuccessMsg(`Sucesso! ${parsed.transactions.length} transações importadas.`);
          setTimeout(() => {
            setSuccessMsg('');
            onClose();
          }, 1500);
        } else if (Array.isArray(parsed)) {
          // Pure array of transactions
          onImportData(parsed, budgets);
          setSuccessMsg(`Sucesso! ${parsed.length} transações importadas.`);
          setTimeout(() => {
            setSuccessMsg('');
            onClose();
          }, 1500);
        } else {
          setErrorMsg('Arquivo de backup inválido ou incompatível.');
        }
      } catch (err) {
        setErrorMsg('Erro ao ler o arquivo JSON. Verifique se o formato está correto.');
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="modal-backup"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Backup & Gestão de Dados</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Exporte ou importe seus registros financeiros</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {successMsg && (
            <div className="p-3 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Export card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Exportar Backup (JSON)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Baixe suas despesas ({transactions.length} registros) e metas salvas
              </span>
            </div>
            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Baixar
            </button>
          </div>

          {/* Import card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Restaurar Backup
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Selecione um arquivo .json anteriormente exportado
              </span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Importar
            </button>
          </div>

          {/* Reset sample data */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Precisa recarregar dados de exemplo?
            </span>
            <button
              onClick={() => {
                onResetToSample();
                setSuccessMsg('Dados de exemplo recarregados com sucesso!');
                setTimeout(() => {
                  setSuccessMsg('');
                  onClose();
                }, 1000);
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Carregar exemplos
            </button>
          </div>

          {/* Clear all data */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 py-2 font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar todos os dados e começar do zero
              </button>
            ) : (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900 text-xs">
                <p className="font-semibold text-rose-800 dark:text-rose-300 mb-2">
                  Tem certeza? Isso apagará todas as transações cadastradas.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClearAll();
                      setShowClearConfirm(false);
                      setSuccessMsg('Todos os dados foram limpos.');
                      setTimeout(() => {
                        setSuccessMsg('');
                        onClose();
                      }, 1000);
                    }}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    Sim, apagar tudo
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
