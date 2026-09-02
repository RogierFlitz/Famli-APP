import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { nl } from "date-fns/locale";

const FALLBACK_TIMEZONE = "Europe/Amsterdam";

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Calendar date `YYYY-MM-DD` in an IANA timezone. Never use UTC midnight for family days. */
export function calendarDateInTimeZone(now: Date, timeZone = FALLBACK_TIMEZONE): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return toISODate(now);
  }
}

export function clockInTimeZone(
  now: Date,
  timeZone = FALLBACK_TIMEZONE,
): { hour: number; minute: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
    return { hour, minute };
  } catch {
    return { hour: now.getHours(), minute: now.getMinutes() };
  }
}

export function parseClockTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** True when an hourly cron should fire the daily brief for this timezone + clock. */
export function matchesDailyBriefSlot(now: Date, timeZone: string, time: string): boolean {
  const target = parseClockTime(time);
  if (!target) return false;
  const clock = clockInTimeZone(now, timeZone);
  return clock.hour === target.hour;
}

export function parseDate(value: string): Date {
  return startOfDay(parseISO(value));
}

export function formatDayLong(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEEE d MMMM", { locale: nl });
}

export function formatDayShort(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEE d MMM", { locale: nl });
}

export function formatTime(value: string): string {
  if (value.includes("T")) {
    return format(parseISO(value), "HH:mm");
  }
  return value.slice(0, 5);
}

export function combineDateTime(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
}

export function monthGrid(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

export function isoWeek(date: Date): number {
  return getISOWeek(date);
}

export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseDate(b), parseDate(a));
}

export function addDaysIso(date: string, amount: number): string {
  return toISODate(addDays(parseDate(date), amount));
}

export function addMonthsIso(date: string, amount: number): string {
  return toISODate(addMonths(parseDate(date), amount));
}

export function sameDay(a: Date | string, b: Date | string): boolean {
  const da = typeof a === "string" ? parseISO(a) : a;
  const db = typeof b === "string" ? parseISO(b) : b;
  return isSameDay(da, db);
}

export { format, nl, startOfMonth, addDays, addMonths, startOfDay };
