import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/types";
import { bootstrapSecretMatches, isAdminBootstrapEnabled, signBootstrapSession } from "@/lib/admin/bootstrap";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  if (!isAdminBootstrapEnabled()) {
    return NextResponse.redirect(new URL("/admin?error=Tijdelijke%20toegang%20is%20uit.", request.url));
  }
  try {
    assertRateLimit("login", "admin:bootstrap");
  } catch {
    return NextResponse.redirect(new URL("/admin?error=Te%20veel%20pogingen.", request.url));
  }
  const form = await request.formData();
  const secret = String(form.get("secret") ?? "");
  if (!bootstrapSecretMatches(secret)) {
    return NextResponse.redirect(new URL("/admin?error=Ongeldige%20tijdelijke%20code.", request.url));
  }
  const response = NextResponse.redirect(new URL("/admin/dashboard", request.url));
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    JSON.stringify({ kind: "bootstrap", token: signBootstrapSession() }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
    },
  );
  return response;
}
