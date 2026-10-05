import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { srmEmail } = await request.json();

    if (!srmEmail) {
      return NextResponse.json(
        { error: "SRM Mail ID is required." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!supabaseUrl || !serviceRoleKey || !smtpEmail || !smtpPassword) {
      console.error("Missing server configuration environment variables.");
      return NextResponse.json(
        { error: "Server configuration error. Missing SMTP credentials." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Verify user exists and is approved in public.profiles
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, status, full_name")
      .eq("srm_email", srmEmail.trim())
      .single();

    if (profErr || !profile) {
      return NextResponse.json(
        { error: "No account found with this SRM Mail ID." },
        { status: 400 }
      );
    }

    if (profile.status !== "approved") {
      return NextResponse.json(
        { error: "Your account is pending or inactive." },
        { status: 400 }
      );
    }

    // 2. Generate 6-digit numeric OTP and set 10-minute expiry
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 3. Clear existing unused OTPs for this user & save new record
    await supabaseAdmin
      .from("password_reset_otps")
      .delete()
      .eq("user_id", profile.id);

    const { error: otpDbErr } = await supabaseAdmin
      .from("password_reset_otps")
      .insert({
        user_id: profile.id,
        srm_email: srmEmail.trim(),
        otp_code: generatedOtp,
        expires_at: expiresAt,
      });

    if (otpDbErr) {
      console.error("Database error saving OTP:", otpDbErr);
      return NextResponse.json(
        { error: "Failed to generate verification code: " + otpDbErr.message },
        { status: 500 }
      );
    }

    // 4. Create Nodemailer Transport with explicit settings for Vercel stability
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });

    // 5. Explicitly AWAIT mail delivery so Vercel doesn't kill execution early
    await transporter.sendMail({
      from: `"GFS SRMIST Core Portal" <${smtpEmail}>`,
      to: srmEmail.trim(),
      subject: "Your Password Reset OTP - GFS SRMIST",
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #10b981; font-weight: 800; margin-bottom: 8px;">GeeksforGeeks SRMIST</h2>
          <p style="font-size: 14px; color: #64748b; margin-top: 0;">Core Team Onboarding Portal</p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 16px 0;" />
          <p style="font-size: 14px; margin-bottom: 12px;">Hello <strong>${profile.full_name}</strong>,</p>
          <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
            Your one-time passcode to reset your portal password is:
          </p>
          <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #059669; background: #ecfdf5; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
            ${generatedOtp}
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
            This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Unhandled API error in send-otp:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}