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

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
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
