import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_ADMINS, ADMIN_SESSION_COOKIE, type AdminActor } from "@/lib/admin/types";
import { demoAdminById } from "@/lib/admin/memory";
import type { AdminRole } from "@/lib/admin/roles";
import { isAdminBootstrapEnabled, parseAdminSessionCookie, readBootstrapSession } from "@/lib/admin/bootstrap";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function actorFromCookie(): Promise<AdminActor | null> {
  const store = await cookies();
  const raw = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parsed = parseAdminSessionCookie(raw);
  if (!parsed) return null;
  if (parsed.kind === "bootstrap") return readBootstrapSession(parsed.token);
  const demo = demoAdminById(parsed.userId);
  if (!demo) return null;
  return { userId: demo.userId, email: demo.email, name: demo.name, role: demo.role };
}

export async function getAdminActor(): Promise<AdminActor | null> {
  const bootstrapped = await actorFromCookie();
  if (bootstrapped?.email === "bootstrap@famli.internal") return bootstrapped;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return bootstrapped;
    const { data: staff } = await supabase
      .from("admin_staff")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!staff?.role) return bootstrapped;
    const meta = data.user.user_metadata as { first_name?: string; last_name?: string } | undefined;
    const name =
      [meta?.first_name, meta?.last_name].filter(Boolean).join(" ") || data.user.email || "Admin";
    return {
      userId: data.user.id,
      email: data.user.email ?? "",
      name,
      role: staff.role as AdminRole,
    };
  }

  return bootstrapped;
}

export async function requireAdmin(): Promise<AdminActor> {
  const actor = await getAdminActor();
  if (!actor) redirect("/admin");
  return actor;
}

export async function familyUserBlockedFromAdmin(): Promise<boolean> {
  if (await getAdminActor()) return false;
  const { getSession } = await import("@/lib/auth/session");
  const session = await getSession();
  if (!session) return false;
  if (isSupabaseConfigured() && !isAdminBootstrapEnabled()) {
    return true;
  }
  const { DEMO_ADMINS } = await import("@/lib/admin/types");
  return !DEMO_ADMINS.some((item) => item.userId === session.userId);
}

export function isDemoAdminEmail(email: string): boolean {
  return DEMO_ADMINS.some((item) => item.email === email.trim().toLowerCase());
}
