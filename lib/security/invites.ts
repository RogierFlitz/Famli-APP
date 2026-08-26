import { randomBytes } from "crypto";

export const INVITE_MIN_TTL_HOURS = 24;
export const INVITE_MAX_TTL_HOURS = 72;

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function inviteExpiresAt(hours: number = INVITE_MAX_TTL_HOURS): Date {
  const clamped = Math.min(INVITE_MAX_TTL_HOURS, Math.max(INVITE_MIN_TTL_HOURS, hours));
  return new Date(Date.now() + clamped * 60 * 60 * 1000);
}

export interface InviteRecord {
  token: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export function validateInvite(
  invite: InviteRecord,
  acceptingEmail: string,
): { valid: true } | { valid: false; reason: string } {
  if (invite.revokedAt) return { valid: false, reason: "Uitnodiging is ingetrokken." };
  if (invite.acceptedAt) return { valid: false, reason: "Uitnodiging is al gebruikt." };
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: "Uitnodiging is verlopen." };
  }
  if (invite.email.toLowerCase() !== acceptingEmail.toLowerCase()) {
    return { valid: false, reason: "Uitnodiging hoort bij een ander e-mailadres." };
  }
  return { valid: true };
}
