import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { AdminActor } from "@/lib/admin/types";

export const BOOTSTRAP_ADMIN: AdminActor = {
  userId: "00000000-0000-4000-a000-adminbootstrap1",
  email: "bootstrap@famli.internal",
  name: "Tijdelijke toegang",
  role: "super_admin",
};

export function adminBootstrapSecret(): string {
  return (process.env.ADMIN_BOOTSTRAP_SECRET ?? "").trim();
}

export function isAdminBootstrapEnabled(): boolean {
  return adminBootstrapSecret().length >= 16;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function bootstrapSecretMatches(input: string): boolean {
  if (!isAdminBootstrapEnabled() || !input) return false;
  return timingSafeEqual(digest(input), digest(adminBootstrapSecret()));
}

export function signBootstrapSession(now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ t: "bootstrap", exp: now + 8 * 60 * 60 * 1000 }), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", adminBootstrapSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readBootstrapSession(token: string): AdminActor | null {
  if (!isAdminBootstrapEnabled()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", adminBootstrapSecret()).update(payload).digest("base64url");
  if (!timingSafeEqual(digest(sig), digest(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { t?: string; exp?: number };
    if (data.t !== "bootstrap" || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return BOOTSTRAP_ADMIN;
  } catch {
    return null;
  }
}

export function parseAdminSessionCookie(raw: string): { kind: "bootstrap"; token: string } | { kind: "demo"; userId: string } | null {
  try {
    const parsed = JSON.parse(raw) as { kind?: string; token?: string; userId?: string };
    if (parsed.kind === "bootstrap" && typeof parsed.token === "string") {
      return { kind: "bootstrap", token: parsed.token };
    }
    if (typeof parsed.userId === "string") {
      return { kind: "demo", userId: parsed.userId };
    }
    return null;
  } catch {
    return null;
  }
}
