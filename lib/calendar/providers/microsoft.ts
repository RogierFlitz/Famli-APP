import { calendarCallbackUrl, microsoftTenantId, MICROSOFT_SCOPES } from "@/lib/calendar/config";
import type { OAuthTokens, ProviderFetchedEvent, TokenRefreshResult } from "@/lib/calendar/types";

const tenant = () => microsoftTenantId();

export function microsoftAuthorizeUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
    redirect_uri: calendarCallbackUrl("microsoft"),
    response_type: "code",
    scope: MICROSOFT_SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    response_mode: "query",
  });
  return `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeMicrosoftCode(code: string, codeVerifier: string): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!.trim(),
    redirect_uri: calendarCallbackUrl("microsoft"),
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Microsoft token exchange failed: ${res.status}`);
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  const profile = await fetchMicrosoftProfile(data.access_token);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    scopes: (data.scope ?? MICROSOFT_SCOPES.join(" ")).split(" "),
    accountId: profile.id,
    accountEmail: profile.email,
  };
}

export async function refreshMicrosoftToken(refreshToken: string): Promise<TokenRefreshResult> {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!.trim(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: MICROSOFT_SCOPES.join(" "),
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Microsoft token refresh failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
  };
}

async function fetchMicrosoftProfile(accessToken: string): Promise<{ id: string; email: string }> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { id: "microsoft", email: "" };
  const data = (await res.json()) as { id: string; mail?: string; userPrincipalName?: string };
  return { id: data.id, email: data.mail ?? data.userPrincipalName ?? "" };
}

export async function fetchMicrosoftEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<ProviderFetchedEvent[]> {
  const params = new URLSearchParams({
    startDateTime: timeMin,
    endDateTime: timeMax,
    $top: "250",
    $orderby: "start/dateTime",
  });
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });
  if (!res.ok) throw new Error(`Microsoft calendar fetch failed: ${res.status}`);
  const data = (await res.json()) as {
    value?: Array<{
      id: string;
      subject?: string;
      location?: { displayName?: string };
      isAllDay?: boolean;
      start?: { dateTime?: string; timeZone?: string };
      end?: { dateTime?: string; timeZone?: string };
    }>;
  };
  return (data.value ?? [])
    .filter((item) => item.id)
    .map((item) => ({
      providerEventId: item.id,
      calendarId: "primary",
      title: item.subject ?? "(Geen titel)",
      location: item.location?.displayName ?? null,
      startsAt: normalizeGraphDateTime(item.start?.dateTime),
      endsAt: normalizeGraphDateTime(item.end?.dateTime),
      allDay: item.isAllDay ?? false,
      raw: item as Record<string, unknown>,
    }))
    .filter((event) => event.startsAt && event.endsAt);
}

function normalizeGraphDateTime(value?: string): string {
  if (!value) return "";
  return value.endsWith("Z") ? value : `${value}Z`;
}
