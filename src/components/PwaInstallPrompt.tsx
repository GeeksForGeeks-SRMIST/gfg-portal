"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";
import Image from "next/image";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;

    if (isIOSDevice && !isStandalone) {
      setIsIos(true);
      const hasDismissed = localStorage.getItem("gfg_pwa_dismissed");
      if (!hasDismissed) {
        setTimeout(() => setIsVisible(true), 1500);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const hasDismissed = localStorage.getItem("gfg_pwa_dismissed");
      if (!hasDismissed) {
        setTimeout(() => setIsVisible(true), 1500);
      }
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

  const dismissPrompt = () => {
    localStorage.setItem("gfg_pwa_dismissed", "true");
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
          <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500">
            Install GFG CORE TEAM
          </h4>
          <p className="text-[10px] opacity-70 mt-0.5 leading-relaxed">
            Add to home screen for instant access, offline support, and phone alerts.
          </p>
        </div>
        <button onClick={dismissPrompt} className="p-1 neo-btn rounded-xl opacity-60 hover:opacity-100 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {isIos ? (
        <div className="mt-3 p-3 neo-pressed rounded-xl text-[10px] space-y-1.5 font-medium text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-1.5">
            <span className="font-bold">1.</span> Tap <Share className="w-3.5 h-3.5 inline mx-0.5" /> Share in Safari
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold">2.</span> Tap <PlusSquare className="w-3.5 h-3.5 inline mx-0.5" /> Add to Home Screen
          </div>
        </div>
      ) : (
        <div className="flex gap-2 mt-4">
          <button
            onClick={dismissPrompt}
            className="w-1/2 py-2.5 neo-btn rounded-xl text-[10px] font-bold uppercase tracking-wider opacity-70 cursor-pointer"
          >
            Not Now
          </button>
          <button
            onClick={handleInstallClick}
            className="w-1/2 py-2.5 neo-btn-green rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Install App
          </button>
        </div>
      )}
    </div>
  );
}