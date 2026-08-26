import { calendarCallbackUrl, GOOGLE_SCOPES } from "@/lib/calendar/config";
import type { OAuthTokens, ProviderCalendar, ProviderFetchedEvent, TokenRefreshResult } from "@/lib/calendar/types";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_LIST = "https://www.googleapis.com/calendar/v3/users/me/calendarList";

export function googleAuthorizeUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: calendarCallbackUrl("google"),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, codeVerifier: string): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
    redirect_uri: calendarCallbackUrl("google"),
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
  });
  const res = await fetch(GOOGLE_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null;
  const profile = await fetchGoogleProfile(data.access_token);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
    scopes: (data.scope ?? GOOGLE_SCOPES.join(" ")).split(" "),
    accountId: profile.id,
    accountEmail: profile.email,
  };
}

export async function refreshGoogleToken(refreshToken: string): Promise<TokenRefreshResult> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(GOOGLE_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
  };
}

async function fetchGoogleProfile(accessToken: string): Promise<{ id: string; email: string }> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { id: "google", email: "" };
  const data = (await res.json()) as { id: string; email: string };
  return { id: data.id, email: data.email };
}

export async function listGoogleCalendars(accessToken: string): Promise<ProviderCalendar[]> {
  const res = await fetch(`${GOOGLE_CALENDAR_LIST}?minAccessRole=reader`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google calendar list failed: ${res.status}`);
  const data = (await res.json()) as { items?: Array<{ id: string; summary: string; primary?: boolean }> };
  return (data.items ?? []).map((item) => ({ id: item.id, name: item.summary, primary: item.primary }));
}

export async function fetchGoogleEvents(
  accessToken: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string,
): Promise<ProviderFetchedEvent[]> {
  const events: ProviderFetchedEvent[] = [];
  for (const calendarId of calendarIds) {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) continue;
    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        summary?: string;
        location?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }>;
    };
    for (const item of data.items ?? []) {
      if (!item.id || item.summary === undefined) continue;
      const allDay = Boolean(item.start?.date && !item.start.dateTime);
      const startsAt = item.start?.dateTime ?? (item.start?.date ? `${item.start.date}T00:00:00.000Z` : null);
      const endsAt = item.end?.dateTime ?? (item.end?.date ? `${item.end.date}T00:00:00.000Z` : null);
      if (!startsAt || !endsAt) continue;
      events.push({
        providerEventId: item.id,
        calendarId,
        title: item.summary || "(Geen titel)",
        location: item.location ?? null,
        startsAt,
        endsAt,
        allDay,
        raw: item as Record<string, unknown>,
      });
    }
  }
  return events;
}
