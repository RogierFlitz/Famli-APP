import { isSupabaseConfigured, supabaseKeyType } from "@/lib/supabase/env";

export async function GET() {
  const configured = isSupabaseConfigured();

  return Response.json({
    ok: true,
    mode: configured ? "supabase" : "demo",
    configured,
    keyType: supabaseKeyType(),
  });
}
