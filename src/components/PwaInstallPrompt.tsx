"use client";

import { useEffect, useState } from "react";
import { Download, Bell, Share, PlusSquare, X, Loader2 } from "lucide-react";
import Image from "next/image";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallCard, setShowInstallCard] = useState(false);

  const [pushStatus, setPushStatus] = useState<"granted" | "denied" | "default">("default");
  const [showPushCard, setShowPushCard] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Comprehensive Installed / Standalone Mode Check
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    const isAlreadyInstalled = localStorage.getItem("gfg_pwa_is_installed") === "true";

    setIsStandalone(standaloneMode);

    if (standaloneMode || isAlreadyInstalled) {
      localStorage.setItem("gfg_pwa_is_installed", "true");
      setShowInstallCard(false);
    }

    // 2. Detect iOS Device
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(isIOSDevice);

    // 3. Show Install Card ONLY if not installed and not dismissed
    const installDismissed = localStorage.getItem("gfg_pwa_install_dismissed");
    if (!standaloneMode && !isAlreadyInstalled && !installDismissed) {
      setShowInstallCard(true);
    }

    // 4. Capture native browser install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standaloneMode && !isAlreadyInstalled && !installDismissed) {
        setShowInstallCard(true);
      }
    };

    // 5. Listen for actual successful app installation event
    const handleAppInstalled = () => {
      localStorage.setItem("gfg_pwa_is_installed", "true");
      setShowInstallCard(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 6. Check Push Notification Permission Status
    if ("Notification" in window) {
      const currentPerm = Notification.permission;
      setPushStatus(currentPerm);

      const pushDismissed = localStorage.getItem("gfg_push_prompt_dismissed");
      if (currentPerm === "default" && !pushDismissed) {
        setShowPushCard(true);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem("gfg_pwa_is_installed", "true");
        setShowInstallCard(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      alert("iOS Setup:\n1. Tap Share in Safari toolbar.\n2. Tap 'Add to Home Screen'.");
    }
  };

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    try {
      const OneSignal = (window as any).OneSignal;
      let permission: NotificationPermission = "default";

      if (OneSignal?.Notifications) {
        await OneSignal.Notifications.requestPermission();
        permission = Notification.permission;
      } else if ("Notification" in window) {
        permission = await Notification.requestPermission();
      }

      setPushStatus(permission);
      if (permission === "granted" || permission === "denied") {
        setShowPushCard(false);
      }
    } catch (err) {
      console.error("Failed to request push permission:", err);
    } finally {
      setIsEnablingPush(false);
    }
  };

  const dismissInstallCard = () => {
    localStorage.setItem("gfg_pwa_install_dismissed", "true");
    setShowInstallCard(false);
  };

  const dismissPushCard = () => {
    localStorage.setItem("gfg_push_prompt_dismissed", "true");
    setShowPushCard(false);
  };

  if (isStandalone) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 space-y-3 pointer-events-none">
      
      {/* Sticky Install Card */}
      {showInstallCard && (
        <div className="pointer-events-auto p-4 neo-flat rounded-[2rem] bg-[var(--bg-base)] border border-emerald-500/40 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="w-11 h-11 rounded-2xl neo-pressed flex items-center justify-center p-2 shrink-0 border border-emerald-500/20">
              <Image src="/gfg.png" alt="GFG" width={28} height={28} className="object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-500 truncate">
                Install GFG CORE TEAM
              </h4>
              <p className="text-[10px] opacity-70 mt-0.5 leading-relaxed">
                Add to your Home Screen for instant native access and offline support.
              </p>
            </div>
            <button
              onClick={dismissInstallCard}
              className="p-1 neo-btn rounded-xl opacity-60 hover:opacity-100 text-rose-500 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isIos ? (
            <div className="mt-3 p-3 neo-pressed rounded-xl text-[10px] space-y-1.5 font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <div className="flex items-center gap-1.5">
                <span className="font-bold">1.</span> Tap <Share className="w-3.5 h-3.5 inline mx-0.5" /> Share in Safari
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold">2.</span> Tap <PlusSquare className="w-3.5 h-3.5 inline mx-0.5" /> Add to Home Screen
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-3">
              <button
                onClick={dismissInstallCard}
                className="w-1/3 py-2 neo-btn rounded-xl text-[10px] font-bold uppercase tracking-wider opacity-60 cursor-pointer"
              >
                Later
              </button>
              <button
                onClick={handleInstallClick}
                className="w-2/3 py-2 neo-btn-green rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download App
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sticky Notification Card */}
      {showPushCard && pushStatus === "default" && (
        <div className="pointer-events-auto p-4 neo-flat rounded-[2rem] bg-[var(--bg-base)] border border-amber-500/40 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="w-11 h-11 rounded-2xl neo-pressed flex items-center justify-center text-amber-500 shrink-0 border border-amber-500/20">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 truncate">
                Enable Push Alerts
              </h4>
              <p className="text-[10px] opacity-70 mt-0.5 leading-relaxed">
                Receive real-time announcements, task deadlines, and official reminders.
              </p>
            </div>
            <button
              onClick={dismissPushCard}
              className="p-1 neo-btn rounded-xl opacity-60 hover:opacity-100 text-rose-500 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={dismissPushCard}
              className="w-1/3 py-2 neo-btn rounded-xl text-[10px] font-bold uppercase tracking-wider opacity-60 cursor-pointer"
            >
              Skip
            </button>
            <button
              onClick={handleEnablePush}
              disabled={isEnablingPush}
              className="w-2/3 py-2 neo-btn rounded-xl text-[10px] font-black uppercase tracking-wider text-amber-500 border border-amber-500/30 flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:bg-amber-500/10 transition-colors"
            >
              {isEnablingPush ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" /> Turn On Alerts
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}