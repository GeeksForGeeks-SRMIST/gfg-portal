// src/app/api/webhooks/push/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Configure Web Push with VAPID credentials
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:gfg@srmist.edu.in',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function POST(request: Request) {
  try {
    // 1. Verify Webhook Secret (Checks both WEBHOOK_SECRET and NEXT_PUBLIC_WEBHOOK_SECRET)
    const authHeader = request.headers.get('authorization');
    const expectedSecret =
      process.env.WEBHOOK_SECRET || process.env.NEXT_PUBLIC_WEBHOOK_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized request secret' },
        { status: 401 }
      );
    }

    // 2. Parse payload safely (Handles both { record: { ... } } and flat { title, message, ... })
    const body = await request.json();
    const record = body.record || body;
    const { title, message, link, target_user_id } = record;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Notification title and message are required.' },
        { status: 400 }
      );
    }

    // 3. Initialize Supabase Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase admin configuration.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 4. Fetch device subscriptions (Targeted user OR broadcast to everyone if null)
    let query = supabaseAdmin.from('push_subscriptions').select('*');
    if (target_user_id) {
      query = query.eq('user_id', target_user_id);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error('Error fetching subscriptions:', subError.message);
      return NextResponse.json(
        { error: 'Failed to fetch device subscriptions: ' + subError.message },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sentToDevices: 0,
        message: 'No active device subscriptions found.',
      });
    }

    // 5. Dispatch Push Notifications in parallel
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription_json,
          JSON.stringify({
            title,
            message,
            link: link || '/dashboard',
          })
        );
      } catch (err: any) {
        // Automatically prune expired or unregistered device tokens (410 Gone / 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        } else {
          console.error(`Failed to send push to sub ID ${sub.id}:`, err.message);
        }
      }
    });

    await Promise.all(pushPromises);

    return NextResponse.json({
      success: true,
      sentToDevices: subscriptions.length,
    });
  } catch (error: any) {
    console.error('Push Webhook API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}