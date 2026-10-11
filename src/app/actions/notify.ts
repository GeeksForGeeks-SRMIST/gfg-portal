"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Admin Supabase client using Service Role Key to bypass RLS for system notification writes
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function sendNotificationToAll(
  title: string,
  message: string,
  link: string = "/dashboard/notices"
) {
  // 1. Verify active user session
  const userSupabase = await createServerClient();
  const { data: { user } } = await userSupabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized access: Session expired." };
  }

  // 2. Insert broadcast notification into notifications table using Admin Client
  const adminSupabase = getAdminSupabase();
  const { data: newNotifRecord, error: notifErr } = await adminSupabase
    .from("notifications")
    .insert({
      user_id: null, // null denotes a global/broadcast notification
      title,
      message,
      link,
      type: "info",
    })
    .select()
    .single();

  if (notifErr) {
    console.error("Database notification insert error:", notifErr.message);
  }

  // 3. Dispatch Push Alert via OneSignal REST API
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    return {
      success: true,
      notif: newNotifRecord,
      warning: "OneSignal API keys missing; saved to database history only.",
    };
  }

  try {
    const targetUrl = link.startsWith("http")
      ? link
      : `${process.env.NEXT_PUBLIC_APP_URL || "https://gfgsrmist-portal.vercel.app"}${link}`;

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ["Total Subscriptions"],
        headings: { en: title },
        contents: { en: message },
        url: targetUrl,
        chrome_web_icon: "/gfg.png",
        chrome_web_badge: "/gfg.png",
      }),
    });

    const data = await res.json();

    return {
      success: res.ok,
      recipients: data?.recipients || 1,
      notif: newNotifRecord,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
      notif: newNotifRecord,
    };
  }
}

export async function sendNotification(options: {
  title: string;
  message: string;
  link?: string;
  target_user_id?: string | null;
}) {
  const { title, message, link = "/dashboard/notices", target_user_id } = options;

  if (!target_user_id) {
    return sendNotificationToAll(title, message, link);
  }

  const userSupabase = await createServerClient();
  const { data: { user } } = await userSupabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized access: Session expired." };
  }

  const adminSupabase = getAdminSupabase();
  const { data: newNotifRecord, error: notifErr } = await adminSupabase
    .from("notifications")
    .insert({
      user_id: target_user_id,
      title,
      message,
      link,
      type: "info",
    })
    .select()
    .single();

  if (notifErr) {
    console.error("Targeted notification insert error:", notifErr.message);
  }

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    return { success: true, notif: newNotifRecord };
  }

  try {
    const targetUrl = link.startsWith("http")
      ? link
      : `${process.env.NEXT_PUBLIC_APP_URL || "https://gfgsrmist-portal.vercel.app"}${link}`;

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_aliases: { external_id: [target_user_id] },
        target_channel: "push",
        headings: { en: title },
        contents: { en: message },
        url: targetUrl,
        chrome_web_icon: "/gfg.png",
      }),
    });

    const data = await res.json();
    return { success: res.ok, notif: newNotifRecord, data };
  } catch (err: any) {
    return { success: false, error: err?.message, notif: newNotifRecord };
  }
}