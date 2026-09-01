import { NextResponse } from "next/server";
import { assertAdminCapability } from "@/lib/admin/roles";
import { getAdminActor } from "@/lib/admin/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createAdminManagedUser, validateAdminNewUser } from "@/lib/admin/user-admin";

export async function POST(request: Request) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.redirect(new URL("/admin", request.url), 303);
  }
  try {
    assertAdminCapability(actor.role, "manage_users");
  } catch {
    return NextResponse.redirect(new URL("/admin/gebruikers", request.url), 303);
  }

  const form = await request.formData();
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const invalid = validateAdminNewUser({ firstName, email, password, confirm });
  if (invalid) {
    return NextResponse.redirect(new URL(`/admin/gebruikers/nieuw?error=${encodeURIComponent(invalid)}`, request.url), 303);
  }

  const rate = checkRateLimit("sensitive", actor.userId);
  if (!rate.allowed) {
    return NextResponse.redirect(
      new URL("/admin/gebruikers/nieuw?error=Te%20veel%20pogingen.", request.url),
      303,
    );
  }

  const result = await createAdminManagedUser(actor, { firstName, lastName, email, password });
  if ("error" in result) {
    return NextResponse.redirect(
      new URL(`/admin/gebruikers/nieuw?error=${encodeURIComponent(result.error)}`, request.url),
      303,
    );
  }

  return NextResponse.redirect(
    new URL(`/admin/gebruikers/${result.userId}?ok=${encodeURIComponent("Account aangemaakt.")}`, request.url),
    303,
  );
}
