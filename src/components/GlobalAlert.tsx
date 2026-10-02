"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

// Intercept window.alert globally and instantly at module evaluation time
if (typeof window !== "undefined") {
  window.alert = (message?: any) => {
    window.dispatchEvent(new CustomEvent("gfg-global-alert", { detail: String(message || "") }));
  };
}

export function GlobalAlert() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleAlert = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setMessage(customEvent.detail);
    };

    window.addEventListener("gfg-global-alert", handleAlert as EventListener);
    return () => {
      window.removeEventListener("gfg-global-alert", handleAlert as EventListener);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm neo-flat rounded-[2rem] p-6 space-y-4 bg-[var(--bg-base)] shadow-2xl border border-white/10 animate-in zoom-in-95">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl neo-pressed flex items-center justify-center shrink-0 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">Notification</h3>
        </div>

        <p className="text-xs opacity-80 leading-relaxed px-1 text-[var(--text-main)]">{message}</p>

        <button
          onClick={() => setMessage(null)}
          className="w-full py-3 neo-btn-green rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer"
        >
          Okay
        </button>
      </div>
    </div>
  );
}