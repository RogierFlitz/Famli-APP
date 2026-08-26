import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  return Response.json({
    ok: true,
    mode: isSupabaseConfigured() ? "supabase" : "demo",
  });
}
