import { addDays } from "date-fns";
import { toISODate } from "@/lib/dates";
import type { ChildActivityKind, EventCategory } from "@/lib/domain/types";

/** ISO weekday: 1 = Monday … 7 = Sunday */
export function upcomingWeekdays(weekday: number, count = 12, from = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 90 && dates.length < count; i++) {
    const day = addDays(from, i);
    const iso = day.getDay() === 0 ? 7 : day.getDay();
    if (iso === weekday) dates.push(toISODate(day));
  }
  return dates;
}

export function activityEventCategory(kind: ChildActivityKind): EventCategory {
  if (kind === "school") return "school";
  if (kind === "opvang") return "opvang";
  return "sport";
}
