/**
 * Guest link tokens for oma/babysitter and externe ophaalverzoeken.
 */
import { createHash, randomBytes } from "crypto";
import type { GuestLinkToken } from "@/lib/domain/types";

export type GuestScope = "calendar_view" | "handover_view" | "child_pickup";

export function generateGuestToken(): string {
  return randomBytes(24).toString("base64url");
}

/** SHA-256 hex digest — stored in DB instead of plaintext token. */
export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function guestLinkUrl(token: GuestLinkToken | string, baseUrl = ""): string {
  const value = typeof token === "string" ? token : token.token;
  return `${baseUrl}/invite/guest/${value}`;
}

export function guestLinkExpiresAt(days = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export type GuestTokenValidation =
  | { valid: true; link: GuestLinkToken }
  | { valid: false; reason: string };

export function validateGuestToken(link: GuestLinkToken | null | undefined): GuestTokenValidation {
  if (!link) return { valid: false, reason: "Link niet gevonden." };
  if (new Date(link.expiresAt) < new Date()) {
    return { valid: false, reason: "Deze link is verlopen." };
  }
  if (link.response) {
    return { valid: false, reason: "Er is al gereageerd op dit verzoek." };
  }
  return { valid: true, link };
}

export function assertGuestLinkScope(link: GuestLinkToken, requiredScope: GuestScope): void {
  if (!link.scopes.includes(requiredScope)) {
    throw new Error("Deze link heeft geen toestemming voor deze actie.");
  }
}

/** Scope required when a guest responds to a linked change request. */
export function assertGuestCanRespondToChangeRequest(link: GuestLinkToken): void {
  assertGuestLinkScope(link, "child_pickup");
}
