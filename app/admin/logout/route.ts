import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/types";
import { SESSION_COOKIE } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Still clear cookies and send the user back to login.
    }
  }
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
