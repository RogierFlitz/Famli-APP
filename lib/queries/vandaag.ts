import { formatTime } from "@/lib/dates";
import { custodianForChild } from "@/lib/calendar/helpers";
import { parentName, urgentActions } from "@/lib/queries/family-view";
import { myOpenDutiesToday } from "@/lib/queries/routines";
import { timelineItemLine } from "@/lib/queries/responsibility";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";

export type ChildTimelineEntry = {
  id: string;
  time: string | null;
  title: string;
  subtitle: string;
  href: string;
  event?: CalendarEvent;
};

export type ChildDaySection = {
  childId: string;
  childName: string;
  custodyLabel: string;
  entries: ChildTimelineEntry[];
};

export function childCustodyLabel(snapshot: FamilySnapshot, childId: string, date: string): string {
  const memberId = custodianForChild(snapshot, date, childId);
  if (!memberId) return "Nog niet ingepland";
  return memberId === snapshot.currentMember.id
    ? "Bij jou"
    : `Bij ${parentName(snapshot, memberId).toLowerCase()}`;
}

export function childTimelineForDate(snapshot: FamilySnapshot, childId: string, date: string): ChildTimelineEntry[] {
  const entries: ChildTimelineEntry[] = [];

  for (const event of snapshot.events.filter(
    (item) => !item.cancelledAt && item.startsAt.startsWith(date) && item.childIds.includes(childId) && item.category !== "overdracht",
  )) {
    entries.push({
      id: event.id,
      time: event.allDay ? null : formatTime(event.startsAt),
      title: event.title.replace(/ Sophie| Roxy/g, "").trim() === "School" ? "School" : event.title,
      subtitle: timelineItemLine(snapshot, event),
      href: `/agenda?date=${date}&focus=${event.id}`,
      event,
    });
  }

  for (const occurrence of snapshot.routineOccurrences.filter((item) => item.date === date && item.childId === childId)) {
    const routine = snapshot.tasks.find((task) => task.id === occurrence.routineId);
    if (!routine || routine.active === false) continue;
    entries.push({
      id: occurrence.id,
      time: occurrence.time,
      title: routine.kind === "care" ? routine.careLabel ?? routine.title : routine.title,
      subtitle: routine.packingItems?.length ? routine.packingItems.join(", ") : "",
      href: `/regelen?tab=voor-jou&id=${occurrence.id}`,
    });
  }

  return entries.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
}

export function childDaySections(snapshot: FamilySnapshot, date: string): ChildDaySection[] {
  return snapshot.children.map((child) => ({
    childId: child.id,
    childName: child.firstName,
    custodyLabel: childCustodyLabel(snapshot, child.id, date),
    entries: childTimelineForDate(snapshot, child.id, date),
  }));
}

export function attentionCount(snapshot: FamilySnapshot, now = new Date()): number {
  const actions = urgentActions(snapshot, now).filter((item) => item.kind !== "change");
  const duties = myOpenDutiesToday(snapshot, now);
  return actions.length + duties.filter((item) => item.occurrence?.status === "pending" || item.task?.status !== "done").length;
}

export function allSettledMessage(snapshot: FamilySnapshot, now = new Date()): { ok: boolean; message: string } {
  const count = attentionCount(snapshot, now);
  if (count === 0) return { ok: true, message: "Alles geregeld ✓" };
  return {
    ok: false,
    message: count === 1 ? "1 ding heeft aandacht nodig" : `${count} dingen hebben aandacht nodig`,
  };
}
