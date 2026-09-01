import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasServiceRoleKey } from "@/lib/supabase/env";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type UserClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export function shouldClaimFirstSuperAdmin(existingStaffCount: number): boolean {
  return existingStaffCount === 0;
}

/** Read staff role even when RLS hides admin_staff from the logged-in user. */
export async function lookupStaffRole(client: UserClient, userId: string): Promise<string | null> {
  const rpc = await client.rpc("staff_admin_role");
  if (typeof rpc.data === "string" && rpc.data) return rpc.data;

  const { data } = await client.from("admin_staff").select("role").eq("user_id", userId).maybeSingle();
  if (data?.role) return String(data.role);

  if (!hasServiceRoleKey()) return null;
  const admin = createSupabaseAdminClient();
  const { data: row } = await admin.from("admin_staff").select("role").eq("user_id", userId).maybeSingle();
  return row?.role ? String(row.role) : null;
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
