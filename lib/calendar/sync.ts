import { addDaysIso, toISODate } from "@/lib/dates";
import { decryptSecret, encryptSecret } from "@/lib/calendar/crypto";
import {
  fetchGoogleEvents,
  fetchIcsEvents,
  fetchMicrosoftEvents,
  listGoogleCalendars,
  refreshGoogleToken,
  refreshMicrosoftToken,
} from "@/lib/calendar/providers";
import type { ProviderFetchedEvent } from "@/lib/calendar/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasServiceRoleKey } from "@/lib/supabase/env";
import type { CalendarProvider } from "@/lib/domain/types";

export interface CalendarConnectionRow {
  id: string;
  user_id: string;
  family_id: string;
  provider: CalendarProvider;
  privacy_mode: string;
  status: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  selected_calendars: Array<{ id: string; name: string; primary?: boolean }> | null;
  ics_url_encrypted: string | null;
  last_synced_at: string | null;
}

function syncWindow(): { timeMin: string; timeMax: string } {
  const today = toISODate(new Date());
  return {
    timeMin: `${addDaysIso(today, -90)}T00:00:00.000Z`,
    timeMax: `${addDaysIso(today, 365)}T23:59:59.999Z`,
  };
}

function tokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now() + 60_000;
}

export async function ensureAccessToken(connection: CalendarConnectionRow): Promise<string | null> {
  if (connection.provider === "apple_ics") return null;
  if (!connection.access_token_encrypted) return null;

  let accessToken = decryptSecret(connection.access_token_encrypted);
  if (!tokenExpired(connection.token_expires_at)) return accessToken;

  const refreshToken = connection.refresh_token_encrypted
    ? decryptSecret(connection.refresh_token_encrypted)
    : null;
  if (!refreshToken) return accessToken;

  const refreshed =
    connection.provider === "google"
      ? await refreshGoogleToken(refreshToken)
      : await refreshMicrosoftToken(refreshToken);

  accessToken = refreshed.accessToken;
  if (hasServiceRoleKey()) {
    const admin = createSupabaseAdminClient();
    await admin
      .from("calendar_connections")
      .update({
        access_token_encrypted: encryptSecret(refreshed.accessToken),
        refresh_token_encrypted: refreshed.refreshToken
          ? encryptSecret(refreshed.refreshToken)
          : connection.refresh_token_encrypted,
        token_expires_at: refreshed.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
  }

  return accessToken;
}

export async function fetchProviderEvents(connection: CalendarConnectionRow): Promise<ProviderFetchedEvent[]> {
  const { timeMin, timeMax } = syncWindow();

  if (connection.provider === "apple_ics") {
    if (!connection.ics_url_encrypted) return [];
    const url = decryptSecret(connection.ics_url_encrypted);
    const events = await fetchIcsEvents(url);
    return events.filter((event) => event.startsAt >= timeMin && event.startsAt <= timeMax);
  }

  const accessToken = await ensureAccessToken(connection);
  if (!accessToken) return [];

  if (connection.provider === "google") {
    let calendarIds = (connection.selected_calendars ?? []).map((item) => item.id);
    if (!calendarIds.length) {
      const list = await listGoogleCalendars(accessToken);
      calendarIds = list.filter((item) => item.primary).map((item) => item.id);
      if (!calendarIds.length && list[0]) calendarIds = [list[0].id];
    }
    return fetchGoogleEvents(accessToken, calendarIds, timeMin, timeMax);
  }

  return fetchMicrosoftEvents(accessToken, timeMin, timeMax);
}

export async function upsertExternalEvents(
  connection: CalendarConnectionRow,
  events: ProviderFetchedEvent[],
): Promise<{ imported: number; deleted: number }> {
  if (!hasServiceRoleKey()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY vereist voor agenda-sync.");
  }
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const providerIds = new Set(events.map((event) => event.providerEventId));

  const { data: existing } = await admin
    .from("calendar_external_events")
    .select("id, provider_event_id")
    .eq("connection_id", connection.id);

  const toDelete = (existing ?? [])
    .filter((row) => !providerIds.has(row.provider_event_id))
    .map((row) => row.id);

  if (toDelete.length) {
    await admin.from("calendar_external_events").delete().in("id", toDelete);
  }

  for (const event of events) {
    await admin.from("calendar_external_events").upsert(
      {
        connection_id: connection.id,
        user_id: connection.user_id,
        family_id: connection.family_id,
        provider_event_id: event.providerEventId,
        calendar_id: event.calendarId ?? null,
        title: event.title,
        location: event.location,
        starts_at: event.startsAt,
        ends_at: event.endsAt,
        all_day: event.allDay,
        raw: event.raw ?? {},
        updated_at: now,
      },
      { onConflict: "connection_id,provider_event_id" },
    );
  }

  await admin
    .from("calendar_connections")
    .update({ last_synced_at: now, sync_error: null, status: "connected", updated_at: now })
    .eq("id", connection.id);

  return { imported: events.length, deleted: toDelete.length };
}

export async function syncCalendarConnection(connectionId: string): Promise<{ imported: number; deleted: number }> {
  if (!hasServiceRoleKey()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY vereist voor agenda-sync.");
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("calendar_connections").select("*").eq("id", connectionId).maybeSingle();
  if (error) throw error;
  if (!data || data.status === "disconnected") {
    throw new Error("Geen actieve agenda-koppeling.");
  }

  const connection = data as CalendarConnectionRow;
  try {
    const events = await fetchProviderEvents(connection);
    return upsertExternalEvents(connection, events);
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "Sync mislukt";
    await admin
      .from("calendar_connections")
      .update({ status: "error", sync_error: message, updated_at: new Date().toISOString() })
      .eq("id", connectionId);
    throw syncError;
  }
}

export async function syncUserConnections(userId: string, options?: { staleOnly?: boolean }): Promise<void> {
  if (!hasServiceRoleKey()) return;
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("calendar_connections")
    .select("id, last_synced_at, status")
    .eq("user_id", userId)
    .eq("status", "connected");

  for (const row of data ?? []) {
    if (options?.staleOnly && row.last_synced_at) {
      const age = Date.now() - new Date(row.last_synced_at).getTime();
      if (age < 15 * 60 * 1000) continue;
    }
    await syncCalendarConnection(row.id);
  }
}

export function mapConnectionRow(row: Record<string, unknown>): CalendarConnectionRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    family_id: String(row.family_id),
    provider: row.provider as CalendarProvider,
    privacy_mode: String(row.privacy_mode),
    status: String(row.status),
    access_token_encrypted: (row.access_token_encrypted as string | null) ?? null,
    refresh_token_encrypted: (row.refresh_token_encrypted as string | null) ?? null,
    token_expires_at: (row.token_expires_at as string | null) ?? null,
    selected_calendars: (row.selected_calendars as CalendarConnectionRow["selected_calendars"]) ?? [],
    ics_url_encrypted: (row.ics_url_encrypted as string | null) ?? null,
    last_synced_at: (row.last_synced_at as string | null) ?? null,
  };
}

export async function saveOAuthConnection(input: {
  userId: string;
  familyId: string;
  provider: "google" | "microsoft";
  tokens: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
    scopes: string[];
    accountId?: string;
    accountEmail?: string;
  };
  selectedCalendars?: Array<{ id: string; name: string; primary?: boolean }>;
}): Promise<string> {
  if (!hasServiceRoleKey()) throw new Error("SUPABASE_SERVICE_ROLE_KEY vereist.");
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const payload = {
    user_id: input.userId,
    family_id: input.familyId,
    provider: input.provider,
    provider_account_id: input.tokens.accountId ?? null,
    provider_account_email: input.tokens.accountEmail ?? null,
    access_token_encrypted: encryptSecret(input.tokens.accessToken),
    refresh_token_encrypted: input.tokens.refreshToken ? encryptSecret(input.tokens.refreshToken) : null,
    token_expires_at: input.tokens.expiresAt,
    scopes: input.tokens.scopes,
    selected_calendars: input.selectedCalendars ?? [],
    status: "connected",
    sync_error: null,
    updated_at: now,
  };

  const { data, error } = await admin
    .from("calendar_connections")
    .upsert(payload, { onConflict: "user_id,provider" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function saveIcsConnection(input: {
  userId: string;
  familyId: string;
  icsUrl: string;
  label?: string;
}): Promise<string> {
  if (!hasServiceRoleKey()) throw new Error("SUPABASE_SERVICE_ROLE_KEY vereist.");
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("calendar_connections")
    .upsert(
      {
        user_id: input.userId,
        family_id: input.familyId,
        provider: "apple_ics",
        ics_url_encrypted: encryptSecret(input.icsUrl),
        provider_account_email: input.label ?? "ICS-abonnement",
        status: "connected",
        sync_error: null,
        updated_at: now,
      },
      { onConflict: "user_id,provider" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function disconnectCalendarConnection(userId: string, provider: CalendarProvider): Promise<void> {
  if (!hasServiceRoleKey()) throw new Error("SUPABASE_SERVICE_ROLE_KEY vereist.");
  const admin = createSupabaseAdminClient();
  const { data: connection } = await admin
    .from("calendar_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (connection?.id) {
    await admin.from("calendar_external_events").delete().eq("connection_id", connection.id);
  }

  await admin
    .from("calendar_connections")
    .update({
      status: "disconnected",
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      ics_url_encrypted: null,
      token_expires_at: null,
      provider_account_email: null,
      provider_account_id: null,
      selected_calendars: [],
      sync_error: null,
      last_synced_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", provider);
}
