"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellOff, Loader2, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ENABLE_RESULT_MESSAGE,
  PUSH_STATE_EVENT,
  enablePush,
  ensurePushSynced,
  getPushSupport,
} from "@/lib/push-client";

type Mode = "hidden" | "prompt" | "blocked" | "ios-install";

export function NotificationPermissionBanner() {
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<Mode>("hidden");
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluate = useCallback(() => {
    const support = getPushSupport();
    if (support === "unsupported") return setMode("hidden");
    if (support === "ios-needs-install") return setMode("ios-install");

    const permission = Notification.permission;
    setMode(permission === "granted" ? "hidden" : permission === "denied" ? "blocked" : "prompt");
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    evaluate();

    const onVisible = () => {
      if (document.visibilityState === "visible") evaluate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", evaluate);
    window.addEventListener(PUSH_STATE_EVENT, evaluate);

    let cancelled = false;
    let status: PermissionStatus | null = null;
    navigator.permissions
      ?.query({ name: "notifications" as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        s.onchange = evaluate;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (status) status.onchange = null;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", evaluate);
      window.removeEventListener(PUSH_STATE_EVENT, evaluate);
    };
  }, [evaluate]);

  useEffect(() => {
    if (signedIn && mode === "hidden") void ensurePushSynced(supabase);
  }, [signedIn, mode, supabase]);

  const handleAction = async () => {
    if (mode !== "prompt") {
      setShowHelp((open) => !open);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await enablePush(supabase);
      if (result === "denied") setShowHelp(true);
      else setError(ENABLE_RESULT_MESSAGE[result] ?? null);
      evaluate();
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn || mode === "hidden") return null;

  const isIos = mode === "ios-install";
  const isBlocked = mode === "blocked";
  const Icon = isIos ? Smartphone : BellOff;

  const message = isIos
    ? "Install this app on your Home Screen to receive push notifications."
    : isBlocked
    ? "Push notifications are blocked on this device. Allow them in your browser settings to get instant updates."
    : "Push notifications are disabled on this device. Enable them to get instant updates.";

  const actionLabel = mode === "prompt" ? "Enable" : showHelp ? "Hide steps" : "Show steps";

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] w-full bg-[var(--bg-base)] pt-[env(safe-area-inset-top)]"
    >
      <div className="border-b border-amber-500/30 bg-amber-500/10">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Icon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="flex-1 text-[11px] font-bold leading-snug text-amber-700 dark:text-amber-300">
            {message}
          </p>
          <button
            type="button"
            onClick={handleAction}
            disabled={busy}
            className="neo-btn-green flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-widest disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            {actionLabel}
          </button>
        </div>

        {error && (
          <p className="mx-auto max-w-6xl px-4 pb-2.5 text-[11px] font-medium text-rose-500">{error}</p>
        )}

        {showHelp && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <div className="neo-pressed space-y-1.5 rounded-xl p-3 text-[11px] leading-relaxed">
              {isIos ? (
                <>
                  <p>1. In Safari, tap the Share button.</p>
                  <p>2. Choose Add to Home Screen.</p>
                  <p>3. Open the app from your Home Screen, then tap Enable.</p>
                </>
              ) : (
                <>
                  <p>Desktop: click the icon left of the address bar, open Notifications, and choose Allow.</p>
                  <p>Android: open the browser menu, then Settings, Site settings, Notifications, and allow this site.</p>
                  <p>iPhone/iPad: open Settings, Notifications, GFG SRMIST, and turn on Allow Notifications.</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}