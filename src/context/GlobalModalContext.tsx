"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

interface ModalContextType {
  showAlert: (title: string, message: string, type?: "success" | "error" | "info") => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, confirmText?: string) => void;
}

const GlobalModalContext = createContext<ModalContextType | undefined>(undefined);

export function GlobalModalProvider({ children }: { children: React.ReactNode }) {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
    confirmText: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Confirm",
  });

  const showAlert = useCallback((title: string, message: string, type: "success" | "error" | "info" = "info") => {
    setAlertState({ isOpen: true, title, message, type });
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void, confirmText = "Confirm") => {
    setConfirmState({ isOpen: true, title, message, onConfirm, confirmText });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Handle ESC key press & body scroll locking
  useEffect(() => {
    const isAnyModalOpen = alertState.isOpen || confirmState.isOpen;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (alertState.isOpen) closeAlert();
        if (confirmState.isOpen) closeConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [alertState.isOpen, confirmState.isOpen, closeAlert, closeConfirm]);

  return (
    <GlobalModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Global Alert Modal */}
      {alertState.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeAlert}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-4 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0 ${
                    alertState.type === "success"
                      ? "text-emerald-500"
                      : alertState.type === "error"
                      ? "text-rose-500"
                      : "text-amber-500"
                  }`}
                >
                  {alertState.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : alertState.type === "error" ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Info className="w-5 h-5" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-xs font-black uppercase tracking-widest truncate">{alertState.title}</h3>
                </div>
              </div>
              <button
                onClick={closeAlert}
                className="p-1.5 neo-btn rounded-xl opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs opacity-80 leading-relaxed px-1 text-[var(--text-main)]">{alertState.message}</p>

            <button
              type="button"
              onClick={closeAlert}
              className="w-full py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer active:scale-98 transition-transform"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Global Confirm Modal */}
      {confirmState.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeConfirm}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-5 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between gap-3 text-rose-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">Confirmation Required</h3>
                </div>
              </div>
              <button
                onClick={closeConfirm}
                className="p-1.5 neo-btn rounded-xl opacity-60 hover:opacity-100 text-[var(--text-main)] transition-opacity"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="neo-pressed rounded-2xl p-4 space-y-1">
              <p className="text-xs font-bold text-[var(--text-main)]">{confirmState.title}</p>
              <p className="text-[11px] opacity-70 leading-relaxed text-[var(--text-main)]">{confirmState.message}</p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={closeConfirm}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmState.onConfirm?.();
                  closeConfirm();
                }}
                className="w-1/2 py-3 neo-btn rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 border border-rose-500/30 cursor-pointer active:scale-98"
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