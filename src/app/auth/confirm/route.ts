import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as any;
  const next = searchParams.get("next") ?? "/change-password";

  if (token_hash && type) {
    const supabase = await createClient();
    
    // Securely exchange the hash for a session
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Success! Redirect to the change password page
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Fallback if the token is completely invalid
  return NextResponse.redirect(new URL("/?error=Invalid_Token", request.url));
}