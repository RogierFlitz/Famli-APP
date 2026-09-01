import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasServiceRoleKey } from "@/lib/supabase/env";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type UserClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export function shouldClaimFirstSuperAdmin(existingStaffCount: number): boolean {
  return existingStaffCount === 0;
}

/** First successful /admin login becomes super_admin when the staff table is empty. */
export async function claimFirstSuperAdmin(client: UserClient, userId: string): Promise<boolean> {
  const rpc = await client.rpc("claim_first_super_admin");
  if (!rpc.error && rpc.data === true) return true;

  if (!hasServiceRoleKey()) return false;
  const admin = createSupabaseAdminClient();
  const { count, error: countError } = await admin.from("admin_staff").select("user_id", { count: "exact", head: true });
  if (countError || !shouldClaimFirstSuperAdmin(count ?? 1)) return false;
  const { error } = await admin.from("admin_staff").insert({ user_id: userId, role: "super_admin" });
  return !error;
}
