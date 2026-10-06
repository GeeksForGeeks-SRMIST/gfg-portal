"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendNotificationToAll(
  title: string,
  message: string,
  link: string = "/dashboard/notices"
) {
  const supabase = await createClient();

  // 1. Verify caller user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized access: Please sign in." };
  }

  // 2. Insert notification record for in-app bell dropdown history
  const { data: newNotif, error: notifErr } = await supabase
    .from("notifications")
    .insert([
      {
        title,
        message,
        link,
        type: "announcement",
        target_user_id: null, // Broadcast to all core team members
      },
    ])
    .select()
    .single();

  if (notifErr) {
    console.error("Failed to store in-app notification record in DB:", notifErr.message);
  }

  // 3. Check for OneSignal Environment Variables
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    console.error("OneSignal API configuration missing in environment variables.");
    return {
      success: false,
      error:
        "OneSignal API keys missing in environment variables (NEXT_PUBLIC_ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY).",
    };
  }

  // 4. Dispatch Push Alert to OneSignal REST API
  try {
    const targetUrl = link.startsWith("http")
      ? link
      : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${link}`;

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ["Total Subscriptions", "Subscribed Users"], // Broadcast to all registered devices
        headings: { en: title },
        contents: { en: message },
        url: targetUrl,
        chrome_web_icon: "/gfg.png",
        chrome_web_badge: "/gfg.png",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("OneSignal API response error:", data);
      return {
        success: false,
        error: data?.errors?.[0] || "Failed to dispatch push alert via OneSignal.",
      };
    }

    return {
      success: true,
      count: data.recipients || 1,
      notif: newNotif,
    };
  } catch (err: any) {
    console.error("Error calling OneSignal API:", err);
    return { success: false, error: err?.message || String(err) };
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