"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Smartphone, CheckCircle2, ExternalLink, Trash2, X } from "lucide-react";
import Link from "next/link";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
    initServiceWorker();

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    const channel = supabase
      .channel("realtime_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);

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
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(channel);
    };
  }, []);

  async function initServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
      await navigator.serviceWorker.register("/sw.js");
      if (Notification.permission === "granted") {
        setPushEnabled(true);
      }
    } catch (err) {
      console.error("Service worker registration failed:", err);
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
    setUnreadCount(data?.length || 0);
  }

  async function deleteNotification(id: string) {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 neo-btn rounded-xl relative hover:text-emerald-500 transition-colors flex items-center justify-center"
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
              <button onClick={deleteAllNotifications} className="text-[9px] font-bold opacity-60 hover:opacity-100 flex items-center gap-1 text-rose-500">
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>

          {!pushEnabled && (
            <button
              onClick={requestPushPermission}
              className="w-full py-2 px-3 neo-btn rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 flex items-center justify-center gap-2 border border-emerald-500/30"
            >
              <Smartphone className="w-3.5 h-3.5" /> Enable Desktop / Mobile Alerts
            </button>
          )}

          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2">
            {notifications.length === 0 ? (
              <p className="text-xs opacity-50 text-center py-6">No recent notifications</p>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-3 neo-pressed rounded-2xl border-l-2 text-xs space-y-1 transition-all border-emerald-500 bg-emerald-500/5 ${n.type === 'reminder' ? 'border-amber-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold leading-tight">{n.title}</p>
                    <button
                      onClick={() => deleteNotification(n.id)}
                      title="Dismiss"
                      className="p-1 neo-btn rounded-lg text-rose-500 hover:scale-110 transition-transform shrink-0"
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
  );
}