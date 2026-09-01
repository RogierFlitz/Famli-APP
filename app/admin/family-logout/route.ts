import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
