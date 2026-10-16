import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (
    message: string, 
    type?: ToastType, 
    action?: { label: string; onClick: () => void }
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'success',
    action?: { label: string; onClick: () => void }
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, action }]);

    // Give a bit more time if there is an action (e.g. 5000ms instead of 3200ms)
    const duration = action ? 5000 : 3200;

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Notification Container */}
      <div 
        aria-live="polite"
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
      >
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-3 ${
                isSuccess
                  ? 'bg-slate-900/95 dark:bg-[#121214]/95 border-emerald-500/40 text-slate-100 shadow-emerald-950/20'
                  : isError
                  ? 'bg-slate-900/95 dark:bg-[#121214]/95 border-rose-500/40 text-slate-100 shadow-rose-950/20'
                  : isWarning
                  ? 'bg-slate-900/95 dark:bg-[#121214]/95 border-amber-500/40 text-slate-100 shadow-amber-950/20'
                  : 'bg-slate-900/95 dark:bg-[#121214]/95 border-slate-700/80 dark:border-white/10 text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                {isWarning && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
                <span className="text-xs font-semibold text-slate-200 break-words leading-tight">
                  {toast.message}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action!.onClick();
                      removeToast(toast.id);
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer active:scale-95"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-slate-200 p-0.5 rounded-lg hover:bg-slate-800 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
