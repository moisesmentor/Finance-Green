import React, { useState } from 'react';
import { X, Share, PlusSquare, Check, Copy, AlertCircle, Smartphone } from 'lucide-react';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';

interface IOSInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSecondaryBrowser?: boolean;
}

export const IOSInstallGuideModal: React.FC<IOSInstallGuideModalProps> = ({
  isOpen,
  onClose,
  isSecondaryBrowser = false,
}) => {
  const [copied, setCopied] = useState(false);

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/80 dark:bg-black/90 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-[#0f1216] rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100 flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Instalar no iPhone / iPad
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Adicione à sua Tela de Início em 3 passos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Se estiver no Chrome ou navegador interno no iOS */}
          {isSecondaryBrowser && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Abra no navegador Safari</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-amber-200/80 leading-relaxed">
                A Apple só permite adicionar aplicativos à Tela de Início através do <strong>Safari</strong>. Copie o link abaixo e cole no Safari:
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2 px-3 rounded-xl bg-white dark:bg-black/40 border border-amber-500/30 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link copiado com sucesso!' : 'Copiar link do app'}</span>
              </button>
            </div>
          )}

          {/* Guia Passo a Passo Visual */}
          <div className="space-y-3.5">
            {/* Passo 1 */}
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Toque no botão Compartilhar</span>
                  <div className="p-1 rounded-md bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 inline-flex">
                    <Share className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Ele fica localizado na barra de navegação inferior do Safari (o quadrado com uma seta apontando para cima).
                </p>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Selecione "Adicionar à Tela de Início"</span>
                  <div className="p-1 rounded-md bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 inline-flex">
                    <PlusSquare className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Role a lista de opções para baixo até encontrar a opção com o ícone de um quadrado com o sinal de mais (+).
                </p>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">
                  Toque em "Adicionar"
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  No canto superior direito da tela de confirmação. O ícone do <strong>Green Finance</strong> será criado na sua Tela de Início!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-black/40 border-t border-slate-100 dark:border-white/10 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
