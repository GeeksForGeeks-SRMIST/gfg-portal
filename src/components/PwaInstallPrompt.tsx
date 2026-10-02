"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import Image from "next/image";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Automatically show prompt after 2 seconds on page load
      setTimeout(() => setIsVisible(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-5 neo-flat rounded-[2rem] bg-[var(--bg-base)] border border-emerald-500/30 shadow-2xl animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex items-start justify-between gap-3">
        <div className="w-12 h-12 rounded-2xl neo-pressed flex items-center justify-center p-2 shrink-0">
          <Image src="/gfg.png" alt="GFG" width={32} height={32} className="object-contain" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-500">Install GFG Portal</h4>
          <p className="text-[10px] opacity-70 mt-0.5 leading-relaxed">
            Add this app to your home screen for quick access, offline support, and instant OS push notifications.
          </p>
        </div>
        <button onClick={() => setIsVisible(false)} className="p-1 neo-btn rounded-xl opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setIsVisible(false)}
          className="w-1/2 py-2.5 neo-btn rounded-xl text-[10px] font-bold uppercase tracking-wider opacity-70"
        >
          Not Now
        </button>
        <button
          onClick={handleInstallClick}
          className="w-1/2 py-2.5 neo-btn-green rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
        >
          <Download className="w-3.5 h-3.5" /> Install App
        </button>
      </div>
    </div>
  );
}