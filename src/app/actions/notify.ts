"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendNotificationToAll(
  title: string,
  message: string,
  link: string = "/dashboard/notices"
) {
  const supabase = await createClient();

  // 1. Verify session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized access: Session expired." };
  }

  // 2. Execute elevated RPC function to create database history record
  const { data: newNotifRecord, error: notifErr } = await supabase.rpc(
    "create_broadcast_notification",
    {
      p_title: title,
      p_message: message,
      p_link: link,
    }
  );

  if (notifErr) {
    console.error("Failed to insert notification into database history:", notifErr.message);
  }

  // 3. Verify OneSignal Keys
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    return {
      success: false,
      error: "OneSignal API keys missing in Vercel environment settings.",
      notif: newNotifRecord,
    };
  }

  // 4. Dispatch Push Alert to OneSignal REST API
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

    if (!res.ok) {
      return {
        success: false,
        error: data?.errors?.[0] || "OneSignal push dispatch failed.",
        notif: newNotifRecord,
      };
    }

    return {
      success: true,
      recipients: data.recipients || 1,
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
  return sendNotificationToAll(
    options.title,
    options.message,
    options.link || "/dashboard/notices"
  );
}