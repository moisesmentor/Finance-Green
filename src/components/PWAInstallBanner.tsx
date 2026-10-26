import React from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface PWAInstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
  isIOS?: boolean;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  onInstall,
  onDismiss,
  isIOS = false,
}) => {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="p-4 rounded-2xl bg-[#0f1216]/95 dark:bg-[#0f1216]/95 backdrop-blur-md border border-emerald-500/30 shadow-2xl shadow-black/80 flex items-center justify-between gap-3 text-white">
        
        {/* Left icon + text */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shrink-0 shadow-md shadow-emerald-500/20">
            <div className="w-full h-full bg-[#0d0f12] rounded-[10px] flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              Instale o Green Finance Pro
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {isIOS ? 'Acesse direto da Tela de Início' : 'App mais rápido e em tela cheia'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onInstall}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer min-h-[36px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Dispensar aviso por 30 dias"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
