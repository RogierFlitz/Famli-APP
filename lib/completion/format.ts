import { format } from "date-fns";
import { parseISO } from "date-fns";
import { formatDayLong, formatTime } from "@/lib/dates";

export function formatCompletedAt(value: string): string {
  const date = parseISO(value);
  const today = new Date();
  const sameDay = value.slice(0, 10) === format(today, "yyyy-MM-dd");
  if (sameDay) {
    return `vandaag ${formatTime(value)}`;
  }
  return `${formatDayLong(value)} · ${formatTime(value)}`;
}
