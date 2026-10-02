import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    // 1. Safety Check: Ensure ENV variables exist
    if (!process.env.RESEND_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server missing required API keys." }, { status: 500 });
    }

    const { srmEmail } = await request.json();

    if (!srmEmail) {
      return NextResponse.json({ error: "SRM Email is required." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 2. Verify user exists
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, status")
      .eq("srm_email", srmEmail.trim())
      .single();

    if (!profile || profile.status !== "approved") {
      return NextResponse.json({ success: true }); 
    }

    // 3. Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); 

    // NOTE: Make sure you actually created the "password_resets" table in Supabase!
    // If you haven't, this line will fail. 
    const { error: dbError } = await supabaseAdmin.from("password_resets").insert({
      profile_id: profile.id,
      token: token,
      expires_at: expiresAt.toISOString(),
    });

    if (dbError) {
      return NextResponse.json({ error: "Database error: " + dbError.message }, { status: 500 });
    }

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/change-password?token=${token}`;

    // 4. Send via Resend HTTP API safely
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "GeeksforGeeks SRMIST <onboarding@resend.dev>",
        to: [srmEmail],
        subject: "Password Reset Request - GFG SRMIST Portal",
        html: `<p>Hello ${profile.full_name}, click <a href="${resetLink}">here</a> to reset your password.</p>`,
      }),
    });

    // Safely parse Resend's response
    const resendText = await resendRes.text();
    if (!resendRes.ok) {
      let errMsg = `Resend failed with status ${resendRes.status}`;
      try {
        const errJson = JSON.parse(resendText);
        errMsg = errJson.message || errMsg;
      } catch (e) { /* Ignore parsing error */ }
      
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}