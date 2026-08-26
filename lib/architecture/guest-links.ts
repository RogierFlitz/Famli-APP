/**
 * Guest link tokens for oma/babysitter — architecture prep only.
 */
import type { GuestLinkToken } from "@/lib/domain/types";

export type GuestScope = "calendar_view" | "handover_view" | "child_pickup";

export function guestLinkUrl(token: GuestLinkToken, baseUrl = ""): string {
  return `${baseUrl}/g/${token.token}`;
}

export function validateGuestToken(_token: string): { valid: false; reason: string } {
  return { valid: false, reason: "Gastlinks nog niet geïmplementeerd." };
}
