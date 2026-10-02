import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { srmEmail, aadhaarLast4, newPassword } = await request.json();

    if (!srmEmail || !aadhaarLast4 || !newPassword) {
      return NextResponse.json({ error: "All verification fields are required." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 1. Find profile by SRM email
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, status")
      .eq("srm_email", srmEmail.trim())
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: "No account found with this SRM Mail ID." }, { status: 400 });
    }

    if (profile.status !== "approved") {
      return NextResponse.json({ error: "Account is not active or approved." }, { status: 400 });
    }

    // 2. Cross-check the private profile for the Aadhaar 4-digit verification
    const { data: privProfile, error: privErr } = await supabaseAdmin
      .from("profile_private")
      .select("aadhaar_last4")
      .eq("profile_id", profile.id)
      .single();

    if (
      privErr || 
      !privProfile || 
      privProfile.aadhaar_last4 !== aadhaarLast4.trim()
    ) {
      return NextResponse.json({ error: "Identity verification failed. Information does not match." }, { status: 403 });
    }

    // 3. Update the password securely using admin auth
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}