"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Trash2, X, ExternalLink, CheckCircle2, Loader2, Smartphone } from "lucide-react";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [enabling, setEnabling] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
    checkPushStatus();

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    // Supabase Realtime Listener for live in-app notifications
    const channel = supabase
      .channel("realtime_notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new;
          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(channel);
    };
  }, []);

  function checkPushStatus() {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushEnabled(Notification.permission === "granted");
    }
  }

  async function requestPushPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Push notifications are not supported on this browser.");
      return;
    }

    setEnabling(true);

    try {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal) {
        await OneSignal.Notifications.requestPermission();
        setPushEnabled(Notification.permission === "granted");
      } else {
        const permission = await Notification.requestPermission();
        setPushEnabled(permission === "granted");
      }
    } catch (err) {
      console.error("OneSignal permission request error:", err);
    } finally {
      setEnabling(false);
    }
  }

  async function fetchNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error) {
      setNotifications(data || []);
      setUnreadCount(data?.length || 0);
    }
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
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

          {pushEnabled ? (
            <div className="w-full py-2 px-3 neo-pressed rounded-xl text-[10px] font-bold text-emerald-500 flex items-center justify-center gap-2 opacity-90">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Push Alerts Active</span>
            </div>
          ) : (
            <button
              onClick={requestPushPermission}
              disabled={enabling}
              className="w-full py-2 px-3 neo-btn rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 flex items-center justify-center gap-2 border border-emerald-500/30 cursor-pointer"
            >
              {enabling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
              <span>Enable Push Notifications</span>
            </button>
          )}

          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2">
            {notifications.length === 0 ? (
              <p className="text-xs opacity-50 text-center py-6">No recent notifications</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-3 neo-pressed rounded-2xl border-l-2 text-xs space-y-1 transition-all border-emerald-500 bg-emerald-500/5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold leading-tight">{n.title}</p>
                    <button onClick={() => deleteNotification(n.id)} className="p-1 neo-btn rounded-lg text-rose-500 hover:scale-110 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="opacity-80 text-[10px] leading-relaxed">{n.message}</p>
                  <div className="flex items-center justify-between pt-1 text-[8px] opacity-50 font-mono">
                    <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    {n.link && (
                      <a href={n.link} className="text-emerald-500 font-bold hover:underline flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </a>
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