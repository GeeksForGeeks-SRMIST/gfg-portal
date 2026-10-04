"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Smartphone, Trash2, X, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  // Notification state management
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null); // null = checking
  const [isIosBrowser, setIsIosBrowser] = useState(false);
  const [showAutoBanner, setShowAutoBanner] = useState(false);
  const [enabling, setEnabling] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
    checkSubscriptionAndPermission();

    if (typeof window !== "undefined") {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
      if (isIOS && !isStandalone) {
        setIsIosBrowser(true);
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    // Supabase Realtime: Updates UI badge and list when app is open
    const channel = supabase
      .channel("realtime_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload) => {
          const newNotif = payload.new;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(channel);
    };
  }, []);

  async function checkSubscriptionAndPermission() {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushEnabled(false);
      return;
    }

    // 1. Check native browser permission state first
    if (Notification.permission === "granted") {
      setPushEnabled(true);
      setShowAutoBanner(false);
      return;
    }

    if (Notification.permission === "denied") {
      setPushEnabled(false);
      setShowAutoBanner(false);
      return;
    }

    // 2. If permission is default, check user's multi-device subscriptions
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (subs && subs.length > 0) {
        setPushEnabled(true);
        setShowAutoBanner(false);
        return;
      }
    }

    // 3. Prompt banner for unconfigured users after 2 seconds
    setPushEnabled(false);
    const hasDismissed = localStorage.getItem("gfg_notif_banner_dismissed");
    if (!hasDismissed) {
      setTimeout(() => setShowAutoBanner(true), 2000);
    }
  }

  async function requestPushPermission() {
    if (isIosBrowser) {
      alert("On iOS, tap Share -> 'Add to Home Screen' first, then open the app from your Home Screen to enable notifications.");
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      alert("Push notifications are not supported on this browser.");
      return;
    }

    setEnabling(true);

    try {
      // 1. Request native browser permission if not already granted
      let permission = Notification.permission;
      if (permission !== "granted") {
        permission = await Notification.requestPermission();
      }
      
      if (permission === "granted") {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error("VAPID public key is missing from environment variables.");
        }

        // 2. Obtain or renew push subscription from browser PushManager
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey,
          });
        }

        // 3. Upsert subscription into multi-device push_subscriptions table
        const { data: { user } } = await supabase.auth.getUser();
        if (user && sub) {
          const { error: dbError } = await supabase
            .from("push_subscriptions")
            .upsert(
              {
                user_id: user.id,
                subscription_json: sub.toJSON(),
              },
              { onConflict: "subscription_json" }
            );

          if (dbError) {
            console.error("Failed to sync subscription to database:", dbError.message);
          }
        }

        setPushEnabled(true);
        setShowAutoBanner(false);

        await reg.showNotification("Notifications Active! 🎉", {
          body: "Mobile alerts configured and synced successfully.",
          icon: "/gfg.png",
          badge: "/gfg.png",
          vibrate: [100, 50, 100],
        } as NotificationOptions & { vibrate?: number[] });
      } else {
        alert("Notification permission was denied. You can enable it anytime in browser settings.");
        setShowAutoBanner(false);
      }
    } catch (err: any) {
      console.error("Error enabling push notifications:", err);
      alert("Could not subscribe to notifications. Please check VAPID variables and console logs.");
    } finally {
      setEnabling(false);
    }
  }

  async function fetchNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(10);

    setNotifications(data || []);
    setUnreadCount(data?.length || 0);
  }

  async function deleteNotification(id: string) {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }

  async function deleteAllNotifications() {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;

    const { error } = await supabase.from("notifications").delete().in("id", ids);
    if (!error) {
      setUnreadCount(0);
      setNotifications([]);
    }
  }

  const dismissBanner = () => {
    localStorage.setItem("gfg_notif_banner_dismissed", "true");
    setShowAutoBanner(false);
  };

  return (
    <>
      {/* 1. Bell Icon & Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 neo-btn rounded-xl relative hover:text-emerald-500 transition-colors flex items-center justify-center cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-black font-black text-[10px] rounded-full flex items-center justify-center animate-pulse shadow">
              {unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-3 w-80 md:w-96 neo-flat rounded-3xl p-4 shadow-2xl z-50 space-y-3 animate-in fade-in zoom-in-95 bg-[var(--bg-base)] border border-[var(--text-muted)]/15">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--text-muted)]/10 px-1">
              <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500">Live Alerts</h4>
              {notifications.length > 0 && (
                <button onClick={deleteAllNotifications} className="text-[9px] font-bold opacity-60 hover:opacity-100 flex items-center gap-1 text-rose-500 cursor-pointer">
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              )}
            </div>

            {/* Persistent State Display */}
            {pushEnabled === true ? (
              <div className="w-full py-2 px-3 neo-pressed rounded-xl text-[10px] font-bold text-emerald-500 flex items-center justify-center gap-2 opacity-90">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Phone Push Alerts Active</span>
              </div>
            ) : pushEnabled === false ? (
              <button
                onClick={requestPushPermission}
                disabled={enabling}
                className="w-full py-2 px-3 neo-btn rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 flex items-center justify-center gap-2 border border-emerald-500/30 cursor-pointer"
              >
                {enabling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
                <span>{isIosBrowser ? "Add to Home Screen for Alerts" : "Enable Mobile Alerts"}</span>
              </button>
            ) : null}

            <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2">
              {notifications.length === 0 ? (
                <p className="text-xs opacity-50 text-center py-6">No recent notifications</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 neo-pressed rounded-2xl border-l-2 text-xs space-y-1 transition-all border-emerald-500 bg-emerald-500/5 ${n.type === "reminder" ? "border-amber-500" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold leading-tight">{n.title}</p>
                      <button
                        onClick={() => deleteNotification(n.id)}
                        title="Dismiss"
                        className="p-1 neo-btn rounded-lg text-rose-500 hover:scale-110 transition-transform shrink-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="opacity-80 text-[10px] leading-relaxed">{n.message}</p>
                    <div className="flex items-center justify-between pt-1 text-[8px] opacity-50 font-mono">
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                      {n.link && (
                        <Link href={n.link} onClick={() => deleteNotification(n.id)} className="text-emerald-500 font-bold hover:underline flex items-center gap-0.5">
                          View <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Automatic First-Time Prompt Banner (Triggers on load until enabled) */}
      {showAutoBanner && (
        <div className="fixed bottom-20 right-6 z-50 max-w-xs w-full p-4 neo-flat rounded-2xl bg-[var(--bg-base)] border border-emerald-500/40 shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-500 font-extrabold text-xs">
              <Smartphone className="w-4 h-4 animate-bounce" />
              <span>Enable Phone Alerts</span>
            </div>
            <button onClick={dismissBanner} className="p-1 neo-btn rounded-lg opacity-60 hover:opacity-100 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>

          <p className="text-[10px] opacity-70 mt-1 leading-relaxed">
            Get instant OS push alerts on your phone for chapter updates and notices.
          </p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={dismissBanner}
              className="w-1/3 py-2 neo-btn rounded-xl text-[9px] font-bold uppercase tracking-wider opacity-60 cursor-pointer"
            >
              Later
            </button>
            <button
              onClick={requestPushPermission}
              disabled={enabling}
              className="w-2/3 py-2 neo-btn-green rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
            >
              {enabling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Enable (1 Tap)"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}