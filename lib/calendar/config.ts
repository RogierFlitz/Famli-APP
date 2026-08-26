import type { CalendarProvider } from "@/lib/domain/types";

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function siteUrl(): string {
  return trimEnv(process.env.NEXT_PUBLIC_SITE_URL) || "http://localhost:3000";
}

export function calendarCallbackUrl(provider: "google" | "microsoft"): string {
  return `${siteUrl()}/api/calendar/${provider}/callback`;
}

export function googleOAuthConfigured(): boolean {
  return Boolean(trimEnv(process.env.GOOGLE_CLIENT_ID) && trimEnv(process.env.GOOGLE_CLIENT_SECRET));
}

export function microsoftOAuthConfigured(): boolean {
  return Boolean(trimEnv(process.env.MICROSOFT_CLIENT_ID) && trimEnv(process.env.MICROSOFT_CLIENT_SECRET));
}

export function microsoftTenantId(): string {
  return trimEnv(process.env.MICROSOFT_TENANT_ID) || "common";
}

export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
export const MICROSOFT_SCOPES = ["Calendars.Read", "offline_access", "User.Read"];

export function providerLabel(provider: CalendarProvider): string {
  if (provider === "google") return "Google";
  if (provider === "microsoft") return "Outlook";
  return "ICS";
}

export const STALE_SYNC_MS = 15 * 60 * 1000;
