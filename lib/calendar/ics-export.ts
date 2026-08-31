/**
 * Famli → Google / Apple / Outlook ICS export.
 * Secret feed tokens authenticate the public URL; never log plaintext tokens.
 */
import { addDays } from "date-fns";
import { toISODate } from "@/lib/dates";
import { eventCategoryLabel } from "@/lib/domain/labels";
import type { CalendarEvent, FamilySnapshot, Handover, Vacation } from "@/lib/domain/types";
import { childNames, parentName } from "@/lib/queries/family-view";
import { siteUrl } from "@/lib/calendar/config";
import { generateGuestToken, hashGuestToken } from "@/lib/architecture/guest-links";

export const ICS_PROD_ID = "-//Famli//Agenda//NL";
export const ICS_TIMEZONE = "Europe/Amsterdam";
const PAST_DAYS = 90;
const FUTURE_DAYS = 400;

export type IcsEvent = {
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  updatedAt: string;
};

export type CalendarFeedStatus = {
  createdAt: string;
};

export type IssuedCalendarFeed = {
  token: string;
  httpsUrl: string;
  webcalUrl: string;
  googleUrl: string;
  appleUrl: string;
  outlookUrl: string;
};

export function newCalendarFeedToken(): string {
  return generateGuestToken();
}

export function calendarFeedTokenHash(token: string): string {
  return hashGuestToken(token);
}

export function normalizeFeedToken(raw: string): string {
  return raw.trim().replace(/\.ics$/i, "");
}

export function calendarFeedPath(token: string): string {
  return `/api/calendar/feed/${encodeURIComponent(token)}.ics`;
}

export function calendarFeedUrls(token: string, calendarName = "Famli"): IssuedCalendarFeed {
  const httpsUrl = `${siteUrl().replace(/\/$/, "")}${calendarFeedPath(token)}`;
  const webcalUrl = httpsUrl.replace(/^https:/i, "webcal:").replace(/^http:/i, "webcal:");
  const name = encodeURIComponent(calendarName);
  return {
    token,
    httpsUrl,
    webcalUrl,
    googleUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`,
    appleUrl: webcalUrl,
    outlookUrl: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}&name=${name}`,
  };
}

export function inExportWindow(isoDate: string, now = new Date()): boolean {
  const day = isoDate.slice(0, 10);
  const from = toISODate(addDays(now, -PAST_DAYS));
  const to = toISODate(addDays(now, FUTURE_DAYS));
  return day >= from && day <= to;
}

export function collectFamliExportEvents(snapshot: FamilySnapshot, now = new Date()): IcsEvent[] {
  const events: IcsEvent[] = [];
  const handoverIdsFromEvents = new Set(
    snapshot.events.filter((item) => item.handoverId).map((item) => item.handoverId as string),
  );

  for (const event of snapshot.events) {
    if (event.cancelledAt) continue;
    if (!inExportWindow(event.startsAt, now) && !inExportWindow(event.endsAt, now)) continue;
    events.push(icsFromCalendarEvent(snapshot, event));
  }

  for (const handover of snapshot.handovers) {
    if (handover.cancelledAt) continue;
    if (handoverIdsFromEvents.has(handover.id)) continue;
    if (!inExportWindow(handover.date, now)) continue;
    events.push(icsFromHandover(snapshot, handover));
  }

  for (const vacation of snapshot.vacations) {
    if (vacation.status === "declined") continue;
    const overlaps =
      inExportWindow(vacation.startsOn, now) ||
      inExportWindow(vacation.endsOn, now) ||
      (vacation.startsOn <= toISODate(now) && vacation.endsOn >= toISODate(now));
    if (!overlaps) continue;
    events.push(icsFromVacation(vacation));
  }

  events.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.uid.localeCompare(b.uid));
  return events;
}

export function buildCalendarIcs(calendarName: string, events: IcsEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${ICS_PROD_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-TIMEZONE:${ICS_TIMEZONE}`,
  ];

  const stamp = formatIcsUtc(now);
  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`LAST-MODIFIED:${formatIcsUtc(parseToUtc(event.updatedAt))}`);
    if (event.allDay) {
      const start = dateValue(event.startsAt);
      const endExclusive = dateValue(addDaysIsoDate(event.endsAt, 1));
      lines.push(`DTSTART;VALUE=DATE:${start}`);
      lines.push(`DTEND;VALUE=DATE:${endExclusive}`);
    } else {
      lines.push(`DTSTART:${formatIcsUtc(parseToUtc(event.startsAt))}`);
      lines.push(`DTEND:${formatIcsUtc(parseToUtc(event.endsAt))}`);
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

function icsFromCalendarEvent(snapshot: FamilySnapshot, event: CalendarEvent): IcsEvent {
  const kids = event.childIds.length ? childNames(snapshot, event.childIds) : "";
  const parts = [
    eventCategoryLabel[event.category],
    kids ? `Kinderen: ${kids}` : "",
    event.notes ?? event.description ?? "",
  ].filter(Boolean);
  return {
    uid: `${event.id}@famli.app`,
    title: event.title,
    description: parts.join("\n") || null,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt || event.startsAt,
    allDay: event.allDay,
    updatedAt: event.updatedAt || event.createdAt,
  };
}

function icsFromHandover(snapshot: FamilySnapshot, handover: Handover): IcsEvent {
  const from = parentName(snapshot, handover.fromMemberId);
  const to = parentName(snapshot, handover.toMemberId);
  const kids = handover.childIds.length ? childNames(snapshot, handover.childIds) : childNames(snapshot);
  const time = handover.time.length === 5 ? `${handover.time}:00` : handover.time;
  const startsAt = `${handover.date}T${time}`;
  return {
    uid: `handover-${handover.id}@famli.app`,
    title: `Wissel: ${from} → ${to}`,
    description: [kids ? `Kinderen: ${kids}` : "", handover.notes ?? ""].filter(Boolean).join("\n") || null,
    location: handover.location,
    startsAt,
    endsAt: addOneHour(startsAt),
    allDay: false,
    updatedAt: handover.updatedAt || handover.createdAt,
  };
}

function icsFromVacation(vacation: Vacation): IcsEvent {
  return {
    uid: `vacation-${vacation.id}@famli.app`,
    title: vacation.title,
    description: vacation.notes,
    location: vacation.region ?? null,
    startsAt: `${vacation.startsOn}T00:00:00`,
    endsAt: `${vacation.endsOn}T00:00:00`,
    allDay: true,
    updatedAt: vacation.updatedAt || vacation.createdAt,
  };
}

export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

export function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let offset = 0;
  let limit = 75;
  while (offset < bytes.length) {
    let end = Math.min(offset + limit, bytes.length);
    while (end > offset && (bytes[end] & 0b1100_0000) === 0b1000_0000) end -= 1;
    chunks.push(bytes.subarray(offset, end).toString("utf8"));
    offset = end;
    limit = 74;
  }
  return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`)).join("\r\n");
}

export function formatIcsUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

export function parseToUtc(value: string): Date {
  if (/[zZ]$/.test(value) || /[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value);
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return new Date(value);
  return amsterdamWallToUtc(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4] ?? "0"),
    Number(match[5] ?? "0"),
    Number(match[6] ?? "0"),
  );
}

function amsterdamWallToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = tzOffsetMs(new Date(utcGuess), ICS_TIMEZONE);
  return new Date(utcGuess - offset);
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const asInZone = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asInZone - date.getTime();
}

function dateValue(iso: string): string {
  return iso.slice(0, 10).replaceAll("-", "");
}

function addDaysIsoDate(iso: string, amount: number): string {
  return toISODate(addDays(new Date(`${iso.slice(0, 10)}T00:00:00Z`), amount));
}

function addOneHour(iso: string): string {
  return new Date(parseToUtc(iso).getTime() + 60 * 60 * 1000).toISOString();
}
