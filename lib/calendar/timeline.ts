import { formatTime } from "@/lib/dates";
import {
  childNames,
  handoverLine,
  pickupLine,
} from "@/lib/queries/family-view";
import { openCareForHandover } from "@/lib/queries/routines";
import type { CalendarEvent, FamilySnapshot, Handover } from "@/lib/domain/types";

export type TimelineKind = "handover" | "school" | "sport" | "event" | "task" | "custody";

export interface TimelineItem {
  id: string;
  time: string | null;
  title: string;
  subtitle: string;
  kind: TimelineKind;
  packingList: string[];
  location: string | null;
  href: string;
  event?: CalendarEvent;
  handover?: Handover;
}

export function timelineForDate(
  snapshot: FamilySnapshot,
  date: string,
  options: { includeCustody?: boolean } = {},
): TimelineItem[] {
  const items: TimelineItem[] = [];
  const occurrence = snapshot.occurrences.find((item) => item.date === date);

  if (options.includeCustody && occurrence) {
    const label = snapshot.members.find((member) => member.id === occurrence.custodianMemberId)?.parentLabel ?? "ouder";
    items.push({
      id: `custody-${date}`,
      time: null,
      title: `Bij ${label.toLowerCase()}`,
      subtitle: childNames(snapshot),
      kind: "custody",
      packingList: [],
      location: null,
      href: `/agenda?date=${date}`,
    });
  }

  for (const handover of snapshot.handovers.filter((item) => item.date === date && !item.cancelledAt)) {
    const careItems = openCareForHandover(snapshot, handover.date);
    const packingList = [
      ...handover.packingList,
      ...careItems.map((item) => `${item.time} ${item.title}`),
    ];
    items.push({
      id: handover.id,
      time: handover.time,
      title: "Wisselmoment",
      subtitle: handoverLine(snapshot, handover),
      kind: "handover",
      packingList,
      location: handover.location,
      href: `/agenda?date=${date}&focus=${handover.eventId ?? handover.id}&view=wissels`,
      handover,
      event: snapshot.events.find((event) => event.id === handover.eventId),
    });
  }

  for (const event of snapshot.events.filter(
    (item) => !item.cancelledAt && item.startsAt.startsWith(date) && item.category !== "overdracht",
  )) {
    const isPickup = /ophalen/i.test(event.title);
    items.push({
      id: event.id,
      time: event.allDay ? null : formatTime(event.startsAt),
      title: event.title.replace(/ Sophie| Roxy/g, "").trim() === "School" ? "School" : event.title,
      subtitle: isPickup
        ? pickupLine(snapshot, event, snapshot.currentMember.id)
        : event.category === "school"
          ? childNames(snapshot, event.childIds)
          : event.location ?? event.notes ?? childNames(snapshot, event.childIds),
      kind: event.category === "school" ? "school" : event.category === "sport" ? "sport" : "event",
      packingList: event.packingList,
      location: event.location,
      href: `/agenda?date=${date}&focus=${event.id}`,
      event,
    });
  }

  return items.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
}
