import { NextResponse } from "next/server";
import { assertAdminCapability } from "@/lib/admin/roles";
import { getAdminActor } from "@/lib/admin/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { setAdminManagedPassword, validateAdminUserPassword } from "@/lib/admin/user-admin";

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
  const userId = String(form.get("userId") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  const back = `/admin/gebruikers/${userId}`;

  if (!userId) {
    return NextResponse.redirect(new URL("/admin/gebruikers", request.url), 303);
  }
  if (!reason) {
    return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent("Reden is verplicht.")}`, request.url), 303);
  }

  const invalid = validateAdminUserPassword(password, confirm);
  if (invalid) {
    return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(invalid)}`, request.url), 303);
  }

  const rate = checkRateLimit("sensitive", actor.userId);
  if (!rate.allowed) {
    return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent("Te veel pogingen.")}`, request.url), 303);
  }

  const result = await setAdminManagedPassword(actor, { userId, password, reason });
  if ("error" in result) {
    return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(result.error)}`, request.url), 303);
  }

  return NextResponse.redirect(
    new URL(`${back}?ok=${encodeURIComponent("Wachtwoord opgeslagen.")}`, request.url),
    303,
  );
}
