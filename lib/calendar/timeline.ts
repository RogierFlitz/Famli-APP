import { formatTime, toISODate } from "@/lib/dates";
import { memberLabel } from "@/lib/custody/generate";
import type { CalendarEvent, FamilySnapshot, Handover } from "@/lib/domain/types";

export type TimelineKind =
  | "handover"
  | "school"
  | "sport"
  | "event"
  | "task"
  | "custody";

export interface TimelineItem {
  id: string;
  time: string | null;
  title: string;
  subtitle: string;
  kind: TimelineKind;
  packingList: string[];
  location: string | null;
  event?: CalendarEvent;
  handover?: Handover;
}

export function timelineForDate(snapshot: FamilySnapshot, date: string): TimelineItem[] {
  const items: TimelineItem[] = [];
  const occurrence = snapshot.occurrences.find((item) => item.date === date);
  if (occurrence) {
    items.push({
      id: `custody-${date}`,
      time: null,
      title: `Bij ${memberLabel(snapshot.members, occurrence.custodianMemberId).toLowerCase()}`,
      subtitle: snapshot.children.map((child) => child.firstName).join(" & "),
      kind: "custody",
      packingList: [],
      location: null,
    });
  }

  for (const handover of snapshot.handovers.filter((item) => item.date === date && !item.cancelledAt)) {
    items.push({
      id: handover.id,
      time: handover.time,
      title: "Overdracht",
      subtitle: `Kinderen naar ${memberLabel(snapshot.members, handover.toMemberId).toLowerCase()}`,
      kind: "handover",
      packingList: handover.packingList,
      location: handover.location,
      handover,
    });
  }

  for (const event of snapshot.events.filter((item) => !item.cancelledAt && item.startsAt.startsWith(date) && item.category !== "overdracht")) {
    items.push({
      id: event.id,
      time: event.allDay ? null : formatTime(event.startsAt),
      title: event.title,
      subtitle: event.location ?? event.notes ?? "",
      kind: event.category === "school" ? "school" : event.category === "sport" ? "sport" : "event",
      packingList: event.packingList,
      location: event.location,
      event,
    });
  }

  return items.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
}

export function todayIso(now = new Date()): string {
  return toISODate(now);
}
