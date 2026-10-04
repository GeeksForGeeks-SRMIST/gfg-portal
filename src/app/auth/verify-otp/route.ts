import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { srmEmail, otpCode, newPassword } = await request.json();

    if (!srmEmail || !otpCode || !newPassword) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Fetch OTP record
    const { data: otpRecord, error: otpErr } = await supabaseAdmin
      .from("password_reset_otps")
      .select("id, user_id, expires_at")
      .eq("srm_email", srmEmail.trim())
      .eq("otp_code", otpCode.trim())
      .single();

    if (otpErr || !otpRecord) {
      return NextResponse.json(
        { error: "Invalid OTP code. Please check and try again." },
        { status: 400 }
      );
    }

    // 2. Check if OTP has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // 3. Update password via Supabase Admin Auth API
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      otpRecord.user_id,
      { password: newPassword }
    );

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // 4. Delete used OTP record
    await supabaseAdmin
      .from("password_reset_otps")
      .delete()
      .eq("id", otpRecord.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}