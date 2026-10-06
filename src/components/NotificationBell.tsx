"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Trash2, X, ExternalLink, CheckCircle2, Loader2, Smartphone, Sparkles } from "lucide-react";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [isIosBrowser, setIsIosBrowser] = useState(false);
  const [enabling, setEnabling] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
    checkDeviceAndPermission();

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    // Custom local event listener for instant UI updates across components
    function handleLocalNoticeDispatched(event: any) {
      if (event.detail) {
        setNotifications((prev) => [event.detail, ...prev.filter((n) => n.id !== event.detail.id)]);
        setUnreadCount((c) => c + 1);
      } else {
        fetchNotifications();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("gfg_notice_dispatched", handleLocalNoticeDispatched);

    // Supabase Realtime Channel
    const channel = supabase
      .channel("realtime_notifications_bell_v4")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newNotif = payload.new;
            setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
            setUnreadCount((c) => c + 1);
          } else {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("gfg_notice_dispatched", handleLocalNoticeDispatched);
      supabase.removeChannel(channel);
    };
  }, []);

  function checkDeviceAndPermission() {
    if (typeof window !== "undefined") {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;

      if (isIOS && !isStandalone) {
        setIsIosBrowser(true);
      }

      if ("Notification" in window) {
        setPushEnabled(Notification.permission === "granted");
      } else {
        setPushEnabled(false);
      }
    }
  }

  async function requestPushPermission() {
    if (isIosBrowser) {
      alert("iOS Setup: Tap Share -> 'Add to Home Screen' in Safari, then open the app from your Home Screen to enable push notifications.");
      return;
    }

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
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Error fetching notification log:", error.message);
      return;
    }

    setNotifications(data || []);
    setUnreadCount(data?.length || 0);
  }

  async function deleteNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      console.error("Error deleting notification:", error.message);
      fetchNotifications();
    }
  }

  async function deleteAllNotifications() {
    if (notifications.length === 0) return;

    setUnreadCount(0);
    setNotifications([]);

    const { error } = await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.error("Error clearing notification log:", error.message);
      fetchNotifications();
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          fetchNotifications();
        }}
        className="p-2.5 neo-btn rounded-xl relative hover:text-emerald-500 transition-colors flex items-center justify-center cursor-pointer"
        aria-label="Notification Log"
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
            <div className="flex items-center gap-1.5 text-emerald-500 font-black text-xs uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Notification Log</span>
            </div>
            {notifications.length > 0 && (
              <button
                onClick={deleteAllNotifications}
                className="text-[9px] font-bold opacity-60 hover:opacity-100 flex items-center gap-1 text-rose-500 cursor-pointer transition-opacity"
              >
                <Trash2 className="w-3 h-3" /> Clear Log
              </button>
            )}
          </div>

          {pushEnabled ? (
            <div className="w-full py-2 px-3 neo-pressed rounded-xl text-[10px] font-bold text-emerald-500 flex items-center justify-center gap-2 opacity-90">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Device Push Active</span>
            </div>
          ) : isIosBrowser ? (
            <button
              onClick={requestPushPermission}
              className="w-full py-2 px-3 neo-btn rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-amber-500 flex items-center justify-center gap-2 border border-amber-500/30 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Add to Home Screen for Alerts</span>
            </button>
          ) : (
            <button
              onClick={requestPushPermission}
              disabled={enabling}
              className="w-full py-2 px-3 neo-btn rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 flex items-center justify-center gap-2 border border-emerald-500/30 cursor-pointer"
            >
              {enabling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
              <span>Enable Push Alerts</span>
            </button>
          )}

          <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8 space-y-1">
                <Bell className="w-6 h-6 mx-auto opacity-20" />
                <p className="text-xs opacity-50 font-medium">No active notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id || Math.random()}
                  className={`p-3 neo-pressed rounded-2xl border-l-2 text-xs space-y-1 transition-all ${
                    n.type === "reminder" ? "border-amber-500 bg-amber-500/5" : "border-emerald-500 bg-emerald-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold leading-tight text-[var(--text-main)]">{n.title}</p>
                    <button
                      onClick={() => deleteNotification(n.id)}
                      className="p-1 neo-btn rounded-lg text-rose-500 hover:scale-110 cursor-pointer transition-transform shrink-0"
                      title="Delete notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="opacity-80 text-[10px] leading-relaxed text-[var(--text-main)]">{n.message}</p>
                  <div className="flex items-center justify-between pt-1 text-[8px] opacity-50 font-mono">
                    <span>{new Date(n.created_at || Date.now()).toLocaleDateString()}</span>
                    {n.link && (
                      <a
                        href={n.link}
                        className="text-emerald-500 font-bold hover:underline flex items-center gap-0.5"
                      >
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