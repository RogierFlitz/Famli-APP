import { addDays } from "date-fns";
import { formatDayLong, formatTime, toISODate } from "@/lib/dates";
import { inferPackingContext } from "@/lib/packing/templates";
import { countPackingProgress, packingProgressLabel, packingRemainingLabel } from "@/lib/packing/progress";
import { parentName } from "@/lib/queries/family-view";
import type { FamilySnapshot, Handover, PackingContext, PackingItem } from "@/lib/domain/types";

export type PackingSuggestion = {
  key: string;
  childId: string;
  label: string;
  context: PackingContext;
  eventId: string | null;
  handoverId: string | null;
  dueOn: string | null;
};

export type PackingGroup = {
  id: string;
  childId: string;
  childName: string;
  title: string;
  when: string;
  href: string;
  items: PackingItem[];
  suggestions: PackingSuggestion[];
  progressLabel: string;
};

function sameLabel(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function childName(snapshot: FamilySnapshot, childId: string) {
  return snapshot.children.find((child) => child.id === childId)?.firstName ?? "Kind";
}

function alreadyCovered(
  items: PackingItem[],
  childId: string,
  label: string,
  eventId: string | null,
  handoverId: string | null,
) {
  return items.some(
    (item) =>
      item.childId === childId &&
      sameLabel(item.label, label) &&
      (eventId ? item.eventId === eventId : true) &&
      (handoverId ? item.handoverId === handoverId : true),
  );
}

export function packingItemsForHandover(snapshot: FamilySnapshot, handover: Handover): PackingItem[] {
  const eventIds = new Set(
    snapshot.events
      .filter(
        (item) =>
          !item.cancelledAt &&
          item.startsAt.slice(0, 10) === handover.date &&
          item.childIds.some((childId) => handover.childIds.includes(childId)),
      )
      .map((item) => item.id),
  );
  const seen = new Set<string>();
  const items: PackingItem[] = [];
  for (const item of snapshot.packingItems ?? []) {
    const linked =
      item.handoverId === handover.id ||
      (item.eventId && eventIds.has(item.eventId) && handover.childIds.includes(item.childId)) ||
      (handover.childIds.includes(item.childId) && item.dueOn === handover.date && item.context === "handover");
    if (!linked || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return items;
}

export function packingItemsForEvent(snapshot: FamilySnapshot, eventId: string): PackingItem[] {
  return (snapshot.packingItems ?? []).filter((item) => item.eventId === eventId);
}

export function handoverPackingSuggestions(snapshot: FamilySnapshot, handover: Handover): PackingSuggestion[] {
  const existing = packingItemsForHandover(snapshot, handover);
  const suggestions: PackingSuggestion[] = [];

  function push(childId: string, label: string, context: PackingContext, eventId: string | null) {
    if (!label.trim()) return;
    if (alreadyCovered(existing, childId, label, eventId, handover.id)) return;
    if (
      suggestions.some(
        (row) => row.childId === childId && sameLabel(row.label, label) && row.eventId === eventId,
      )
    ) {
      return;
    }
    suggestions.push({
      key: `sug-${handover.id}-${childId}-${label}-${eventId ?? "han"}`,
      childId,
      label,
      context,
      eventId,
      handoverId: handover.id,
      dueOn: handover.date,
    });
  }

  for (const childId of handover.childIds) {
    for (const label of handover.packingList ?? []) {
      push(childId, label, "handover", null);
    }
  }

  for (const event of snapshot.events.filter(
    (item) =>
      !item.cancelledAt &&
      item.startsAt.slice(0, 10) === handover.date &&
      item.childIds.some((childId) => handover.childIds.includes(childId)),
  )) {
    const context = inferPackingContext(event.title, event.category);
    for (const childId of event.childIds.filter((id) => handover.childIds.includes(id))) {
      for (const label of event.packingList ?? []) {
        push(childId, label, context, event.id);
      }
    }
  }

  return suggestions;
}

export function handoverOpenTaskLabels(snapshot: FamilySnapshot, handover: Handover): string[] {
  return snapshot.tasks
    .filter(
      (item) =>
        item.kind === "one_off" &&
        item.status !== "done" &&
        item.childId &&
        handover.childIds.includes(item.childId) &&
        item.dueAt?.slice(0, 10) === handover.date,
    )
    .map((item) => item.title);
}

export function handoverProgress(snapshot: FamilySnapshot, handover: Handover) {
  const items = packingItemsForHandover(snapshot, handover);
  const packing = countPackingProgress(items);
  const openTasks = handoverOpenTaskLabels(snapshot, handover).length;
  const remaining = packing.remaining + openTasks;
  return {
    items,
    ...packing,
    openTasks,
    remaining,
    label: packingProgressLabel(packing.checked, packing.total + openTasks),
    remainingLabel: packingRemainingLabel(remaining),
  };
}

export function todayPackingGroups(snapshot: FamilySnapshot, now = new Date()): PackingGroup[] {
  const today = toISODate(now);
  const tomorrow = toISODate(addDays(now, 1));
  const dates = new Set([today, tomorrow]);
  const groups = new Map<string, PackingGroup>();

  function groupKey(childId: string, eventId: string | null, handoverId: string | null, dueOn: string) {
    return `${childId}|${handoverId ?? eventId ?? dueOn}`;
  }

  function ensureGroup(input: {
    childId: string;
    title: string;
    when: string;
    href: string;
    eventId: string | null;
    handoverId: string | null;
    dueOn: string;
  }): PackingGroup {
    const id = groupKey(input.childId, input.eventId, input.handoverId, input.dueOn);
    const existing = groups.get(id);
    if (existing) return existing;
    const created: PackingGroup = {
      id,
      childId: input.childId,
      childName: childName(snapshot, input.childId),
      title: input.title,
      when: input.when,
      href: input.href,
      items: [],
      suggestions: [],
      progressLabel: "",
    };
    groups.set(id, created);
    return created;
  }

  for (const item of snapshot.packingItems ?? []) {
    if (!item.dueOn || !dates.has(item.dueOn)) continue;
    const event = item.eventId ? snapshot.events.find((row) => row.id === item.eventId) : null;
    const handover = item.handoverId
      ? snapshot.handovers.find((row) => row.id === item.handoverId)
      : snapshot.handovers.find((row) => row.date === item.dueOn && row.childIds.includes(item.childId));
    const when =
      item.dueOn === today ? event && !event.allDay ? formatTime(event.startsAt) : "Vandaag" : "Morgen";
    const title = event
      ? event.title
      : handover
        ? `naar ${parentName(snapshot, handover.toMemberId).toLowerCase()}`
        : "Meenemen";
    const href = handover
      ? `/agenda?date=${handover.date}&view=wissels`
      : event
        ? `/agenda?date=${event.startsAt.slice(0, 10)}&focus=${event.id}`
        : `/kinderen/${item.childId}`;
    const group = ensureGroup({
      childId: item.childId,
      title,
      when,
      href,
      eventId: item.eventId,
      handoverId: item.handoverId,
      dueOn: item.dueOn,
    });
    group.items.push(item);
  }

  for (const date of [today, tomorrow]) {
    const when = date === today ? "Vandaag" : "Morgen";
    for (const event of snapshot.events.filter(
      (item) => !item.cancelledAt && item.startsAt.startsWith(date) && item.category !== "overdracht",
    )) {
      for (const childId of event.childIds) {
        const group = ensureGroup({
          childId,
          title: event.title,
          when: event.allDay ? when : formatTime(event.startsAt),
          href: `/agenda?date=${date}&focus=${event.id}`,
          eventId: event.id,
          handoverId: null,
          dueOn: date,
        });
        for (const label of event.packingList ?? []) {
          if (alreadyCovered(group.items, childId, label, event.id, null)) continue;
          if (group.suggestions.some((row) => sameLabel(row.label, label))) continue;
          group.suggestions.push({
            key: `sug-${event.id}-${childId}-${label}`,
            childId,
            label,
            context: inferPackingContext(event.title, event.category),
            eventId: event.id,
            handoverId: null,
            dueOn: date,
          });
        }
      }
    }

    for (const handover of snapshot.handovers.filter((item) => !item.cancelledAt && item.date === date)) {
      for (const childId of handover.childIds) {
        const group = ensureGroup({
          childId,
          title: `naar ${parentName(snapshot, handover.toMemberId).toLowerCase()}`,
          when: `${when} · ${handover.time}`,
          href: `/agenda?date=${date}&view=wissels`,
          eventId: null,
          handoverId: handover.id,
          dueOn: date,
        });
        for (const label of handover.packingList ?? []) {
          if (alreadyCovered(group.items, childId, label, null, handover.id)) continue;
          if (group.suggestions.some((row) => sameLabel(row.label, label))) continue;
          group.suggestions.push({
            key: `sug-${handover.id}-${childId}-${label}`,
            childId,
            label,
            context: "handover",
            eventId: null,
            handoverId: handover.id,
            dueOn: date,
          });
        }
      }
    }
  }

  const result = [...groups.values()].filter((group) => group.items.length || group.suggestions.length);
  for (const group of result) {
    group.progressLabel = packingProgressLabel(
      group.items.filter((item) => item.checked).length,
      group.items.length + group.suggestions.length,
    );
  }
  return result;
}

export type UpcomingPackingCard = {
  id: string;
  title: string;
  when: string;
  href: string;
  progressLabel: string;
};

export function upcomingPackingForChild(
  snapshot: FamilySnapshot,
  childId: string,
  now = new Date(),
  days = 14,
): UpcomingPackingCard[] {
  const start = toISODate(now);
  const end = toISODate(addDays(now, days));
  const cards: UpcomingPackingCard[] = [];

  const items = (snapshot.packingItems ?? []).filter(
    (item) => item.childId === childId && item.dueOn && item.dueOn >= start && item.dueOn <= end,
  );

  const byKey = new Map<string, PackingItem[]>();
  for (const item of items) {
    const key = item.handoverId ?? item.eventId ?? item.dueOn ?? item.id;
    const list = byKey.get(key) ?? [];
    list.push(item);
    byKey.set(key, list);
  }

  for (const [key, list] of byKey) {
    const first = list[0]!;
    const event = first.eventId ? snapshot.events.find((row) => row.id === first.eventId) : null;
    const handover = first.handoverId
      ? snapshot.handovers.find((row) => row.id === first.handoverId)
      : snapshot.handovers.find((row) => row.date === first.dueOn && row.childIds.includes(childId));
    const remaining = list.filter((item) => !item.checked).length;
    cards.push({
      id: key,
      title: event
        ? event.title
        : handover
          ? `Naar ${parentName(snapshot, handover.toMemberId).toLowerCase()}`
          : "Meenemen",
      when: first.dueOn ? formatDayLong(first.dueOn) : "",
      href: handover
        ? `/agenda?date=${handover.date}&view=wissels`
        : event
          ? `/agenda?date=${event.startsAt.slice(0, 10)}&focus=${event.id}`
          : `/kinderen/${childId}`,
      progressLabel:
        remaining <= 0 ? "Alles gereed ✓" : remaining === 1 ? "1 ding nog niet klaar" : `${remaining} dingen mee`,
    });
  }

  for (const event of snapshot.events.filter(
    (item) =>
      !item.cancelledAt &&
      item.category !== "overdracht" &&
      !item.handoverId &&
      item.childIds.includes(childId) &&
      item.startsAt.slice(0, 10) >= start &&
      item.startsAt.slice(0, 10) <= end &&
      (item.packingList ?? []).length,
  )) {
    if (cards.some((card) => card.id === event.id)) continue;
    const leftover = (event.packingList ?? []).length;
    cards.push({
      id: event.id,
      title: event.title,
      when: formatDayLong(event.startsAt),
      href: `/agenda?date=${event.startsAt.slice(0, 10)}&focus=${event.id}`,
      progressLabel: leftover === 1 ? "1 ding mee" : `${leftover} dingen mee`,
    });
  }

  for (const handover of snapshot.handovers.filter(
    (item) =>
      !item.cancelledAt &&
      item.childIds.includes(childId) &&
      item.date >= start &&
      item.date <= end &&
      (item.packingList ?? []).length,
  )) {
    if (cards.some((card) => card.id === handover.id)) continue;
    cards.push({
      id: handover.id,
      title: `Naar ${parentName(snapshot, handover.toMemberId).toLowerCase()}`,
      when: formatDayLong(handover.date),
      href: `/agenda?date=${handover.date}&view=wissels`,
      progressLabel:
        handover.packingList.length === 1 ? "1 ding mee" : `${handover.packingList.length} dingen mee`,
    });
  }

  return cards.sort((a, b) => a.when.localeCompare(b.when, "nl")).slice(0, 6);
}
