import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { srmEmail, aadhaarLast4, newPassword } = await request.json();

    if (!srmEmail || !aadhaarLast4 || !newPassword) {
      return NextResponse.json(
        { error: "All verification fields are required." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase credentials in server environment.");
      return NextResponse.json(
        { error: "Server configuration error. Please contact the administrator." },
        { status: 500 }
      );
    }

    // Initialize Supabase client with the Service Role key to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Fetch profile details using the SRM Mail ID
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, status, aadhaar_last4")
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
        { error: "Your account is not active or approved." },
        { status: 400 }
      );
    }

    // 2. Verify identity via the last 4 digits
    if (!profile.aadhaar_last4 || profile.aadhaar_last4 !== aadhaarLast4.trim()) {
      return NextResponse.json(
        { error: "Identity verification failed. Information does not match." },
        { status: 403 }
      );
    }

    // 3. Reset password via Supabase Admin Auth API
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    );

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}