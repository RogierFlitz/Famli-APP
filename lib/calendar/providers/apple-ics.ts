import type { ProviderFetchedEvent } from "@/lib/calendar/types";

/** Minimal ICS parser for VEVENT blocks (Apple Calendar subscription). */
export function parseIcsEvents(icsText: string): ProviderFetchedEvent[] {
  const unfolded = icsText.replace(/\r\n[ \t]/g, "");
  const blocks = unfolded.split("BEGIN:VEVENT");
  const events: ProviderFetchedEvent[] = [];

  for (const block of blocks.slice(1)) {
    const chunk = block.split("END:VEVENT")[0] ?? "";
    const uid = readIcsField(chunk, "UID");
    const summary = readIcsField(chunk, "SUMMARY") ?? "(Geen titel)";
    const location = readIcsField(chunk, "LOCATION");
    const dtStart = readIcsField(chunk, "DTSTART");
    const dtEnd = readIcsField(chunk, "DTEND");
    if (!uid || !dtStart) continue;

    const allDay = dtStart.length === 8;
    const startsAt = parseIcsDate(dtStart);
    const endsAt = dtEnd ? parseIcsDate(dtEnd) : startsAt;
    if (!startsAt || !endsAt) continue;

    events.push({
      providerEventId: uid,
      calendarId: "ics",
      title: summary,
      location: location ?? null,
      startsAt,
      endsAt,
      allDay,
    });
  }

  return events;
}

function readIcsField(block: string, key: string): string | null {
  const match = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, "m"));
  return match?.[1]?.trim() ?? null;
}

function parseIcsDate(value: string): string | null {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`;
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z`;
}

export async function fetchIcsEvents(url: string): Promise<ProviderFetchedEvent[]> {
  const res = await fetch(url, { headers: { Accept: "text/calendar" } });
  if (!res.ok) throw new Error(`ICS ophalen mislukt (${res.status})`);
  const text = await res.text();
  return parseIcsEvents(text);
}
