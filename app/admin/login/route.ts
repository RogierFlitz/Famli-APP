import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { addAudit, demoAdminById } from "@/lib/admin/memory";
import { adminLoginErrorPath, adminPasswordLoginDestination } from "@/lib/admin/password-login";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/types";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  try {
    const result = await adminPasswordLoginDestination(email, password);
    const response = NextResponse.redirect(new URL(result.path, request.url), 303);
    if (result.demoUserId) {
      const demo = demoAdminById(result.demoUserId);
      if (demo) {
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
      }
    }
    return response;
  } catch {
    return NextResponse.redirect(
      new URL(adminLoginErrorPath("Inloggen in beheer mislukt. Probeer het opnieuw."), request.url),
      303,
    );
  }
}
