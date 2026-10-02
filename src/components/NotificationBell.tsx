"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check, Smartphone, CheckCircle2 } from "lucide-react";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
    registerServiceWorker();

    // Subscribe to Realtime Postgres Changes
    const channel = supabase
      .channel("realtime_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);

          // Native Web Notification API
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(newNotif.title, {
              body: newNotif.message,
              icon: "/gfg.png",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function registerServiceWorker() {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        if (Notification.permission === "granted") {
          setPushEnabled(true);
        }
      } catch (err) {
        console.error("Service worker registration failed:", err);
      }
    }
  }

  async function requestPushPermission() {
    if (!("Notification" in window)) {
      alert("Push notifications are not supported on this browser.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setPushEnabled(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Optional VAPID Key string if configuring external WebPush server
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("push_subscriptions").insert({
          user_id: user.id,
          subscription: subscription,
          user_agent: navigator.userAgent
        });
      }
      alert("Mobile & Desktop OS Push Notifications Activated!");
    } else {
      alert("Notification permission was denied.");
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
    setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
  }

  async function markAllAsRead() {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;

    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 neo-btn rounded-xl relative hover:text-emerald-500 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 neo-flat rounded-2xl p-4 shadow-2xl z-50 space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--text-muted)]/10">
            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500">Live Alerts</h4>
            <button onClick={markAllAsRead} className="text-[9px] font-bold opacity-60 hover:opacity-100 flex items-center gap-1">
              <Check className="w-3 h-3" /> Mark Read
            </button>
          </div>

          {/* Device Push Activation Banner */}
          {!pushEnabled ? (
            <button
              onClick={requestPushPermission}
              className="w-full py-2 px-3 neo-btn rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 flex items-center justify-center gap-2 border border-emerald-500/30"
            >
              <Smartphone className="w-3.5 h-3.5" /> Enable Mobile OS Push
            </button>
          ) : (
            <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 flex items-center justify-center gap-1 py-1 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-3 h-3" /> Mobile Push Active
            </div>
          )}

          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
            {notifications.length === 0 ? (
              <p className="text-xs opacity-50 text-center py-4">No recent notifications</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-3 neo-pressed rounded-xl border-l-2 text-xs space-y-0.5 ${n.type === 'reminder' ? 'border-amber-500' : 'border-emerald-500'}`}>
                  <p className="font-bold">{n.title}</p>
                  <p className="opacity-70 text-[10px] leading-relaxed">{n.message}</p>
                  <p className="text-[8px] opacity-40 uppercase tracking-widest pt-1">{new Date(n.created_at).toLocaleTimeString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}