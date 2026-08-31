import { addDays } from "date-fns";
import { formatTime, toISODate } from "@/lib/dates";
import { bringHaalToday } from "@/lib/queries/bring-haal";
import { childDaySections, childTimelineForDate } from "@/lib/queries/vandaag";
import { forgetNot } from "@/lib/queries/child-life";
import { parentName } from "@/lib/queries/family-view";
import { myOpenDutiesToday } from "@/lib/queries/routines";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";

export type PackingLine = {
  id: string;
  label: string;
  context: string;
  href: string;
};

export type NowSoonEvent = {
  id: string;
  time: string | null;
  title: string;
  who: string;
  href: string;
  event?: CalendarEvent;
};

export type TomorrowLine = {
  id: string;
  time: string | null;
  title: string;
  packing: string[];
  href: string;
};

export type WeekGlance = {
  events: number;
  sports: number;
  handovers: number;
  openTasks: number;
};

function eventsOnDate(snapshot: FamilySnapshot, date: string): CalendarEvent[] {
  return snapshot.events.filter((item) => !item.cancelledAt && item.startsAt.startsWith(date));
}

export function packingForDate(snapshot: FamilySnapshot, date: string): PackingLine[] {
  const lines: PackingLine[] = [];
  const seen = new Set<string>();

  function push(id: string, label: string, context: string, href: string) {
    const key = `${label.toLowerCase()}|${context}`;
    if (seen.has(key) || !label.trim()) return;
    seen.add(key);
    lines.push({ id, label, context, href });
  }

  for (const event of eventsOnDate(snapshot, date)) {
    const names = snapshot.children
      .filter((child) => event.childIds.includes(child.id))
      .map((child) => child.firstName)
      .join(" & ");
    for (const item of event.packingList ?? []) {
      push(`event-${event.id}-${item}`, item, names || event.title, `/agenda?date=${date}&focus=${event.id}`);
    }
  }

  for (const occurrence of snapshot.routineOccurrences.filter((item) => item.date === date)) {
    const routine = snapshot.tasks.find((task) => task.id === occurrence.routineId && task.active !== false);
    if (!routine?.packingItems?.length) continue;
    const child = snapshot.children.find((row) => row.id === occurrence.childId);
    for (const item of routine.packingItems) {
      push(
        `routine-${occurrence.id}-${item}`,
        item,
        child?.firstName ?? routine.title,
        `/regelen?tab=voor-jou&id=${occurrence.id}`,
      );
    }
  }

  for (const handover of snapshot.handovers.filter((item) => !item.cancelledAt && item.date === date)) {
    for (const item of handover.packingList ?? []) {
      push(`handover-${handover.id}-${item}`, item, "Overdracht", `/agenda?date=${date}&view=wissels`);
    }
  }

  return lines;
}

export function nowAndSoon(snapshot: FamilySnapshot, now = new Date()): { now: NowSoonEvent[]; soon: NowSoonEvent[] } {
  const today = toISODate(now);
  const stamp = now.toISOString().slice(0, 16);
  const nowItems: NowSoonEvent[] = [];
  const soonItems: NowSoonEvent[] = [];

  for (const event of eventsOnDate(snapshot, today).sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    if (event.category === "overdracht") continue;
    const names = snapshot.children
      .filter((child) => event.childIds.includes(child.id))
      .map((child) => child.firstName)
      .join(" & ");
    const row: NowSoonEvent = {
      id: event.id,
      time: event.allDay ? null : formatTime(event.startsAt),
      title: event.title,
      who: names,
      href: `/agenda?date=${today}&focus=${event.id}`,
      event,
    };
    const start = event.startsAt.slice(0, 16);
    const end = event.endsAt.slice(0, 16);
    if (start <= stamp && end >= stamp) nowItems.push(row);
    else if (start > stamp) soonItems.push(row);
  }

  return { now: nowItems, soon: soonItems };
}

export function tomorrowPreview(snapshot: FamilySnapshot, now = new Date()): TomorrowLine[] {
  const tomorrow = toISODate(addDays(now, 1));
  const lines: TomorrowLine[] = [];
  for (const child of snapshot.children) {
    for (const entry of childTimelineForDate(snapshot, child.id, tomorrow)) {
      const packing = entry.event?.packingList?.length
        ? entry.event.packingList
        : entry.subtitle
          ? entry.subtitle.split(", ").filter(Boolean)
          : [];
      lines.push({
        id: `${child.id}-${entry.id}`,
        time: entry.time,
        title: `${child.firstName}: ${entry.title}`,
        packing,
        href: entry.href,
      });
    }
  }
  return lines.slice(0, 8);
}

export function openShoppingCount(snapshot: FamilySnapshot): number {
  return (snapshot.shoppingItems ?? []).filter((item) => !item.completed).length;
}

export function weekGlance(snapshot: FamilySnapshot, now = new Date()): WeekGlance {
  const start = toISODate(now);
  const end = toISODate(addDays(now, 6));
  const events = snapshot.events.filter(
    (item) => !item.cancelledAt && item.startsAt.slice(0, 10) >= start && item.startsAt.slice(0, 10) <= end,
  );
  return {
    events: events.filter((item) => item.category !== "overdracht").length,
    sports: events.filter((item) => item.category === "sport").length,
    handovers: snapshot.handovers.filter((item) => !item.cancelledAt && item.date >= start && item.date <= end).length,
    openTasks: snapshot.tasks.filter((item) => item.status !== "done" && item.active !== false && item.kind !== "routine").length,
  };
}

export function eveningOpen(snapshot: FamilySnapshot, now = new Date()): NowSoonEvent[] {
  const today = toISODate(now);
  return eventsOnDate(snapshot, today)
    .filter((event) => !event.allDay && event.category !== "overdracht" && formatTime(event.startsAt) >= "17:00")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((event) => ({
      id: event.id,
      time: formatTime(event.startsAt),
      title: event.title,
      who: snapshot.children.filter((child) => event.childIds.includes(child.id)).map((child) => child.firstName).join(" & "),
      href: `/agenda?date=${today}&focus=${event.id}`,
      event,
    }));
}

export function hasBringHaal(snapshot: FamilySnapshot, date?: string) {
  return bringHaalToday(snapshot, date).length > 0;
}

export function forgetAndPack(snapshot: FamilySnapshot, now = new Date()) {
  const today = toISODate(now);
  return {
    packing: packingForDate(snapshot, today),
    needed: forgetNot(snapshot, now),
    duties: myOpenDutiesToday(snapshot, now),
    shopping: openShoppingCount(snapshot),
    sections: childDaySections(snapshot, today),
    tomorrow: tomorrowPreview(snapshot, now),
    week: weekGlance(snapshot, now),
    evening: eveningOpen(snapshot, now),
    currentName: snapshot.currentProfile.firstName,
    parentLabel: parentName(snapshot, snapshot.currentMember.id),
  };
}
