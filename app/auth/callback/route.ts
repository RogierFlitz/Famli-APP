import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/security/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("next"), "/login/nieuw-wachtwoord");
  if (code && isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const failed = new URL("/login/wachtwoord-vergeten", url.origin);
      failed.searchParams.set("error", "De resetlink is ongeldig of verlopen.");
      return NextResponse.redirect(failed);
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
