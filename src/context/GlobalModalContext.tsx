"use client";

import React, { createContext, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

interface ModalContextType {
  showAlert: (title: string, message: string, type?: "success" | "error" | "info") => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, confirmText?: string) => void;
}

const GlobalModalContext = createContext<ModalContextType | undefined>(undefined);

export function GlobalModalProvider({ children }: { children: React.ReactNode }) {
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" | "info" }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info"
  });

  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: (() => void) | null; confirmText: string }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Confirm"
  });

  const showAlert = (title: string, message: string, type: "success" | "error" | "info" = "info") => {
    setAlertState({ isOpen: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Confirm") => {
    setConfirmState({ isOpen: true, title, message, onConfirm, confirmText });
  };

  return (
    <GlobalModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Global Alert Modal */}
      {alertState.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-4 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0 ${
                alertState.type === 'success' ? 'text-emerald-500' :
                alertState.type === 'error' ? 'text-rose-500' : 'text-amber-500'
              }`}>
                {alertState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                 alertState.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-black uppercase tracking-widest truncate">{alertState.title}</h3>
              </div>
            </div>

            <p className="text-xs opacity-80 leading-relaxed px-1">{alertState.message}</p>

            <button
              onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
              className="w-full py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Global Confirm Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-5 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">Confirmation Required</h3>
              </div>
            </div>

            <div className="neo-pressed rounded-2xl p-4 space-y-1">
              <p className="text-xs font-bold text-[var(--text-main)]">{confirmState.title}</p>
              <p className="text-[11px] opacity-70 leading-relaxed">{confirmState.message}</p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmState.onConfirm?.();
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
                }}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 border border-rose-500/30 cursor-pointer"
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </GlobalModalContext.Provider>
  );
}

export function useGlobalModal() {
  const context = useContext(GlobalModalContext);
  if (!context) throw new Error("useGlobalModal must be used within a GlobalModalProvider");
  return context;
}