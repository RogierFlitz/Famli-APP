import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { CalendarProvider } from "@/lib/domain/types";

const COOKIE_NAME = "famli_calendar_oauth";
const MAX_AGE_SECONDS = 600;

export interface OAuthStatePayload {
  state: string;
  codeVerifier: string;
  userId: string;
  familyId: string;
  provider: CalendarProvider;
  createdAt: number;
}

function encodePayload(payload: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(raw: string): OAuthStatePayload | null {
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthStatePayload;
  } catch {
    return null;
  }
}

export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

export async function storeOAuthState(input: Omit<OAuthStatePayload, "state" | "createdAt">): Promise<string> {
  const state = randomBytes(24).toString("base64url");
  const payload: OAuthStatePayload = { ...input, state, createdAt: Date.now() };
  const store = await cookies();
  store.set(COOKIE_NAME, encodePayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
  return state;
}

export async function consumeOAuthState(expectedState: string): Promise<OAuthStatePayload | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  store.delete(COOKIE_NAME);
  if (!raw) return null;

  const payload = decodePayload(raw);
  if (!payload) return null;
  if (payload.state !== expectedState) return null;
  if (Date.now() - payload.createdAt > MAX_AGE_SECONDS * 1000) return null;
  return payload;
}

export function validateOAuthState(payload: OAuthStatePayload | null, expectedState: string): boolean {
  if (!payload) return false;
  if (payload.state !== expectedState) return false;
  if (Date.now() - payload.createdAt > MAX_AGE_SECONDS * 1000) return false;
  return true;
}
