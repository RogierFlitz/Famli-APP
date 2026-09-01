import { claimFirstSuperAdmin, lookupStaffRole } from "@/lib/admin/first-staff";
import { demoAdminByEmail } from "@/lib/admin/memory";
import { isMissingRelationError } from "@/lib/admin/schema-errors";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function adminLoginErrorPath(message: string): string {
  return `/admin?error=${encodeURIComponent(message)}`;
}

export type AdminPasswordLoginResult = {
  path: string;
  demoUserId?: string;
};

/** Password login for /admin. Returns a path — never throws a Next.js redirect. */
export async function adminPasswordLoginDestination(
  email: string,
  password: string,
): Promise<AdminPasswordLoginResult> {
  const rate = checkRateLimit("login", `admin:${email}`);
  if (!rate.allowed) {
    return { path: adminLoginErrorPath("Te veel pogingen. Probeer het later opnieuw.") };
  }

  if (!isSupabaseConfigured()) {
    const demo = demoAdminByEmail(email);
    if (!demo) return { path: adminLoginErrorPath("Geen adminaccount voor dit e-mailadres.") };
    return { path: "/admin/dashboard", demoUserId: demo.userId };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { path: adminLoginErrorPath(error.message) };

  const { data } = await supabase.auth.getUser();
  if (!data.user) return { path: adminLoginErrorPath("Inloggen mislukt.") };

  try {
    const role = await lookupStaffRole(supabase, data.user.id);
    if (!role) {
      const claimed = await claimFirstSuperAdmin(supabase, data.user.id);
      if (!claimed) {
        await supabase.auth.signOut();
        return {
          path: adminLoginErrorPath(
            "Dit account heeft geen adminrechten. De SQL-rij is er, maar de app kan die niet lezen zonder RLS-policy of SERVICE_ROLE_KEY.",
          ),
        };
      }
    }
    await supabase.from("admin_audit_log").insert({
      admin_user_id: data.user.id,
      action: "admin.login",
      metadata: { source: "supabase" },
    });
  } catch (caught) {
    await supabase.auth.signOut();
    const schemaError = isMissingRelationError(caught as { message?: string; code?: string });
    return {
      path: adminLoginErrorPath(
        schemaError
          ? "De tabel admin_staff ontbreekt. Voer 0015_admin_staff_minimal.sql uit in Supabase."
          : "Inloggen in beheer mislukt. Controleer admin_staff en de RLS-policy.",
      ),
    };
  }

  return { path: "/admin/dashboard" };
}
