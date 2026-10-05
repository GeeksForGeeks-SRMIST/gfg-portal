"use server";

import { createClient } from "@/lib/supabase/server";
import webpush from "@/lib/push";

type NotifyPayload = {
  title: string;
  message: string;
  link?: string;
  target_user_id?: string | null;
};

export async function sendNotification(payload: NotifyPayload) {
  const supabase = await createClient();

  // 1. Insert into Supabase (Triggers Realtime UI Bell)
  const { error: dbError } = await supabase.from("notifications").insert({
    title: payload.title,
    message: payload.message,
    target_user_id: payload.target_user_id,
    type: "notice"
  });

  if (dbError) {
    console.error("Database insert failed:", dbError);
    throw new Error("Database insert failed");
  }

  // 2. Fetch active Web-Push subscriptions using YOUR EXACT COLUMN NAME (subscription_json)
  let query = supabase.from("push_subscriptions").select("subscription_json, subscription_hash");
  
  if (payload.target_user_id) {
    query = query.eq("user_id", payload.target_user_id);
  }

  const { data: subs, error: subError } = await query;
  
  if (subError) console.error("Subscription fetch error:", subError);
  if (!subs || subs.length === 0) return { success: true, sent: 0 };

  // 3. Fire Web-Push to offline devices
  const pushPayload = JSON.stringify({
    title: payload.title,
    message: payload.message,
    link: payload.link || "/dashboard"
  });

  let sentCount = 0;
  const deliveryPromises = subs.map(async (row) => {
    try {
      // Must pass the valid JSON object directly to web-push
      await webpush.sendNotification(row.subscription_json, pushPayload);
      sentCount++;
    } catch (err: any) {
      console.error("Web Push Error:", err);
      // If subscription expired or revoked, clean it up
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("subscription_hash", row.subscription_hash);
      }
    }
  });

  await Promise.all(deliveryPromises);
  return { success: true, sent: sentCount };
}