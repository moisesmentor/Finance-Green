import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

interface PWAUpdateToastProps {
  onUpdate: () => void;
}

export const PWAUpdateToast: React.FC<PWAUpdateToastProps> = ({ onUpdate }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 w-auto max-w-[92vw]">
      <div className="px-4 py-2.5 rounded-full bg-emerald-950/90 text-white backdrop-blur-md border border-emerald-500/40 shadow-xl shadow-black/60 flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-emerald-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Nova versão disponível!</span>
        </div>
        <button
          type="button"
          onClick={onUpdate}
          className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Atualizar</span>
        </button>
      </div>
    </div>
  );
};
