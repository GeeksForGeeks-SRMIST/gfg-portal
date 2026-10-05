"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

const RUNNING_BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const MIN_GAP_MS = 30 * 1000;
const REQUEST_TIMEOUT_MS = 8 * 1000;

export function UpdateNotifier() {
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastCheckAt = useRef(0);
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current || Date.now() - lastCheckAt.current < MIN_GAP_MS) return;
    inFlight.current = true;
    lastCheckAt.current = Date.now();

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch("/api/version", { cache: "no-store", signal: controller.signal });
      if (!res.ok) return;
      const { buildId } = (await res.json()) as { buildId?: string };
      if (buildId && buildId !== "dev" && buildId !== RUNNING_BUILD) setUpdateReady(true);
    } catch {
      /* Retry on next tick */
    } finally {
      window.clearTimeout(timeout);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (RUNNING_BUILD === "dev" || updateReady) return;

    const tick = () => {
      if (document.visibilityState === "visible") void check();
    };

    const interval = window.setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("online", tick);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("online", tick);
    };
  }, [check, updateReady]);

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (/ChunkLoadError|Loading chunk .* failed/i.test(String(event.reason))) {
        setUpdateReady(true);
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  if (!updateReady || dismissed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <div
        role="status"
        aria-live="polite"
        className="neo-flat pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-emerald-500/40 bg-[var(--bg-base)] p-3 pl-4 animate-in slide-in-from-bottom-5 duration-300"
      >
        <RefreshCw className="h-4 w-4 shrink-0 text-emerald-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold">New version available</p>
          <p className="text-[10px] leading-snug opacity-70">
            Refresh to load the latest features and fixes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="neo-btn-green shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-widest"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="neo-btn shrink-0 cursor-pointer rounded-lg p-1.5 opacity-60 hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}