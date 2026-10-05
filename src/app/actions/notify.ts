"use server";

import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

// 1. Configure web-push with your environment VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:gfg.srmist@gmail.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.replace(/['"]/g, "").trim(),
    process.env.VAPID_PRIVATE_KEY.replace(/['"]/g, "").trim()
  );
}

export async function sendNotificationToAll(title: string, message: string, link: string = "/dashboard") {
  const supabase = await createClient();

  // 2. Verify caller user session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Unauthorized access: Please sign in to send notifications." };
  }

  // 3. Insert notification record for in-app bell dropdown history
  const { error: notifErr } = await supabase
    .from("notifications")
    .insert([
      {
        title,
        message,
        link,
        type: "announcement",
        target_user_id: null, // Broadcast to all core team members
      },
    ]);

  if (notifErr) {
    console.error("Failed to store in-app notification record in DB:", notifErr.message);
  }

  // 4. Fetch all active push subscriptions from database
  const { data: subscriptions, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("id, subscription_json");

  if (subErr) {
    console.error("Error fetching push subscriptions from DB:", subErr.message);
    return { success: false, error: `Database query error: ${subErr.message}` };
  }

  if (!subscriptions || subscriptions.length === 0) {
    return {
      success: true,
      count: 0,
      message: "Notice saved to DB, but no active device subscriptions were found in 'push_subscriptions'.",
    };
  }

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return {
      success: false,
      error: "VAPID Keys are missing in Vercel environment settings (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).",
    };
  }

  const payload = JSON.stringify({ title, message, link });

  // 5. Dispatch Web Push payload to all registered device endpoints
  let sentCount = 0;
  const staleSubscriptionIds: string[] = [];
  let lastPushError = "";

  await Promise.all(
    subscriptions.map(async (row) => {
      const sub = row.subscription_json;
      if (!sub || !sub.endpoint) return;

      try {
        await webpush.sendNotification(sub, payload);
        sentCount++;
      } catch (err: any) {
        lastPushError = err?.message || String(err);
        // HTTP 410 (Gone) or 404 (Not Found) indicates expired/unregistered subscription
        if (err.statusCode === 410 || err.statusCode === 404) {
          staleSubscriptionIds.push(row.id);
        } else {
          console.error("Failed to deliver push to device endpoint:", err);
        }
      }
    })
  );

  // 6. Automatically purge expired subscription tokens
  if (staleSubscriptionIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleSubscriptionIds);
  }

  if (sentCount === 0 && subscriptions.length > 0) {
    return {
      success: false,
      error: `Push dispatch failed for all ${subscriptions.length} registered device(s). Error: ${lastPushError}`,
    };
  }

  return { success: true, count: sentCount };
}

// Compat export wrapper for object-style client calls from Notice page
export async function sendNotification(options: {
  title: string;
  message: string;
  link?: string;
  target_user_id?: string | null;
}) {
  return sendNotificationToAll(options.title, options.message, options.link || "/dashboard/notices");
}