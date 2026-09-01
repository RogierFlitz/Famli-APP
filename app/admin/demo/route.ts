import { NextResponse } from "next/server";
import { demoAdminByEmail, addAudit } from "@/lib/admin/memory";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/types";
import { SESSION_COOKIE } from "@/lib/domain/types";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/admin?error=Demo-admin%20is%20uitgeschakeld%20met%20Supabase.", request.url));
  }
  const familySession = request.headers.get("cookie")?.includes(`${SESSION_COOKIE}=`);
  if (familySession) {
    return NextResponse.redirect(new URL("/admin/geweigerd", request.url));
  }
  if (isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/admin?error=Demo-admin%20is%20uitgeschakeld%20met%20Supabase.", request.url));
  }
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  try {
    assertRateLimit("login", `admin:${email}`);
  } catch {
    return NextResponse.redirect(new URL("/admin?error=Te%20veel%20pogingen.", request.url));
  }
  const demo = demoAdminByEmail(email);
  if (!demo) {
    return NextResponse.redirect(new URL("/admin?error=Onbekende%20admin.", request.url));
  }
  const response = NextResponse.redirect(new URL("/admin/dashboard", request.url));
  response.cookies.set(ADMIN_SESSION_COOKIE, JSON.stringify({ userId: demo.userId }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  });
  addAudit({
    id: randomUUID(),
    adminUserId: demo.userId,
    action: "admin.login",
    targetUserId: null,
    familyId: null,
    reason: null,
    metadata: { source: "demo" },
    createdAt: new Date().toISOString(),
  });
  return response;
}
