import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/domain/types";
import { applySecurityHeaders } from "@/lib/security/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy";

const publicPaths = ["/", "/login", "/signup", "/invite", "/admin", "/auth/callback", "/manifest.webmanifest"];

function isPublicPath(pathname: string) {
  return (
    publicPaths.includes(pathname) ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.startsWith("/famli-")
  );
}

/** Login + ping must not wait on Supabase; a hung getUser() looks like a dead Chrome tab. */
export function skipSupabaseAuthRefresh(pathname: string): boolean {
  return pathname === "/admin" || pathname === "/admin/ok";
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  applySecurityHeaders(response.headers);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  if (isSupabaseConfigured()) {
    if (skipSupabaseAuthRefresh(pathname)) {
      return withSecurityHeaders(NextResponse.next());
    }
    const { client, response } = createSupabaseProxyClient(request);
    const { data } = await client.auth.getUser();
    if (!data.user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return withSecurityHeaders(NextResponse.redirect(url));
    }
    return withSecurityHeaders(response);
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withSecurityHeaders(NextResponse.redirect(url));
  }
  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
