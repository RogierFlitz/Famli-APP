import { createClient } from "@supabase/supabase-js";
import { hasServiceRoleKey, supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Service-role Supabase client — SERVER ONLY.
 * Use for unauthenticated flows (guest links) that must bypass RLS safely on the server.
 */
export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Admin client must never be used in the browser.");
  }
  if (!hasServiceRoleKey()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is niet geconfigureerd.");
  }
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
