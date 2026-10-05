import { SupabaseClient } from "@supabase/supabase-js";

export const PUSH_SUBSCRIPTION_COLUMN = "subscription_json";
export const PUSH_STATE_EVENT = "gfg_push_state_changed";

export type PushSupport = "supported" | "unsupported" | "ios-needs-install";

export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";

  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  if (isIos && !isStandalone) return "ios-needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";

  return "supported";
}

export async function isDeviceSubscribed(): Promise<boolean> {
  if (getPushSupport() !== "supported") return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const cleanKey = base64String.replace(/['"]/g, "").trim();
  const padding = "=".repeat((4 - (cleanKey.length % 4)) % 4);
  const base64 = (cleanKey + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type EnablePushResult =
  | "granted"
  | "denied"
  | "unsupported"
  | "ios-needs-install"
  | "missing-key"
  | "error";

export const ENABLE_RESULT_MESSAGE: Record<EnablePushResult, string | null> = {
  granted: null,
  denied: null,
  unsupported: "Push notifications are not supported on this browser.",
  "ios-needs-install": "Tap Share -> Add to Home Screen in Safari to enable mobile alerts.",
  "missing-key": "Public push key is missing in environment settings.",
  error: "Failed to enable notifications. Please try again.",
};

export async function enablePush(supabase: SupabaseClient): Promise<EnablePushResult> {
  const support = getPushSupport();
  if (support !== "supported") return support;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return "missing-key";

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      window.dispatchEvent(new Event(PUSH_STATE_EVENT));
      return "denied";
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          [PUSH_SUBSCRIPTION_COLUMN]: sub.toJSON(),
        },
        { onConflict: "user_id" }
      );
    }

    window.dispatchEvent(new Event(PUSH_STATE_EVENT));
    return "granted";
  } catch (err) {
    console.error("Error enabling push:", err);
    return "error";
  }
}

export async function ensurePushSynced(supabase: SupabaseClient): Promise<void> {
  if (getPushSupport() !== "supported") return;
  if (Notification.permission !== "granted") return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        [PUSH_SUBSCRIPTION_COLUMN]: sub.toJSON(),
      },
      { onConflict: "user_id" }
    );
  } catch {
    /* Silent sync error */
  }
}