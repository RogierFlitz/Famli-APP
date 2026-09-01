import { addDays } from "date-fns";
import { formatDayLong, formatTime, toISODate } from "@/lib/dates";
import { custodianForChild } from "@/lib/calendar/helpers";
import { neededLocationLabel } from "@/lib/domain/labels";
import { childNames, handoverLine, parentName } from "@/lib/queries/family-view";
import { openCareForHandover } from "@/lib/queries/routines";
import { neededHeadline } from "@/lib/queries/child-life";
import { packingItemsForHandover } from "@/lib/queries/packing";
import type { FamilySnapshot, Handover, NeededItem, NeededItemLocation } from "@/lib/domain/types";

export type HandoverChecklistItem = {
  id: string;
  label: string;
  detail?: string;
};

export type HandoverChecklist = {
  handover: Handover;
  meenemen: HandoverChecklistItem[];
  belangrijk: HandoverChecklistItem[];
  ophalen: HandoverChecklistItem[];
  childUpdates: HandoverChecklistItem[];
};

function locationLabel(item: NeededItem, snapshot: FamilySnapshot): string {
  if (item.location === "custom" && item.locationCustom) return item.locationCustom;
  if (item.location && item.location !== "onbekend") return neededLocationLabel[item.location];
  return "onbekend";
}

function targetParentLocation(toMemberId: string, snapshot: FamilySnapshot): NeededItemLocation | null {
  const member = snapshot.members.find((row) => row.id === toMemberId);
  if (!member) return null;
  const label = (member.parentLabel ?? "").toLowerCase();
  if (/papa|vader|rogier/.test(label)) return "bij_papa";
  if (/mama|moeder|emma/.test(label)) return "bij_mama";
  return null;
}

function neededForHandover(snapshot: FamilySnapshot, handover: Handover): HandoverChecklistItem[] {
  const targetLoc = targetParentLocation(handover.toMemberId, snapshot);
  const items: HandoverChecklistItem[] = [];

  for (const item of snapshot.neededItems.filter(
    (row) =>
      handover.childIds.includes(row.childId) &&
      row.status !== "gekocht" &&
      row.status !== "niet_meer_nodig",
  )) {
    if (!item.location || item.location === "onbekend" || item.location === "bij_kind") continue;
    if (targetLoc && item.location !== targetLoc && item.location !== "op_school" && item.location !== "onderweg") {
      const child = snapshot.children.find((row) => row.id === item.childId);
      items.push({
        id: item.id,
        label: item.title,
        detail: `${item.title} moet mee naar ${parentName(snapshot, handover.toMemberId).toLowerCase()} · nu ${locationLabel(item, snapshot).toLowerCase()}`,
      });
      void child;
    }
    if (item.category === "sport" && item.location === "bij_sportclub") {
      items.push({
        id: `sport-${item.id}`,
        label: item.title,
        detail: `${item.title} moet mee naar ${parentName(snapshot, handover.toMemberId).toLowerCase()}`,
      });
    }
  }

  return items;
}

export function assembleHandoverChecklist(snapshot: FamilySnapshot, handover: Handover): HandoverChecklist {
  const date = handover.date;
  const meenemen: HandoverChecklistItem[] = [];
  const belangrijk: HandoverChecklistItem[] = [];
  const ophalen: HandoverChecklistItem[] = [];

  for (const item of packingItemsForHandover(snapshot, handover)) {
    if (!meenemen.some((row) => row.label.toLowerCase() === item.label.toLowerCase())) {
      meenemen.push({ id: item.id, label: item.label });
    }
  }
  for (const item of handover.packingList) {
    if (!meenemen.some((row) => row.label.toLowerCase() === item.toLowerCase())) {
      meenemen.push({ id: `pack-${item}`, label: item });
    }
  }

  for (const care of openCareForHandover(snapshot, date)) {
    belangrijk.push({
      id: care.id,
      label: care.title,
      detail: care.instructions ?? undefined,
    });
  }

  for (const event of snapshot.events.filter(
    (item) =>
      !item.cancelledAt &&
      item.startsAt.slice(0, 10) === date &&
      item.childIds.some((childId) => handover.childIds.includes(childId)),
  )) {
    if (event.schoolKind === "studiedag") {
      belangrijk.push({ id: event.id, label: "Studiedag", detail: event.title });
    }
    if (event.category === "feestje") {
      belangrijk.push({ id: event.id, label: "Feestje", detail: `${formatTime(event.startsAt)} · ${event.location ?? ""}` });
    }
    for (const pack of event.packingList) {
      if (!meenemen.some((row) => row.label.toLowerCase() === pack.toLowerCase())) {
        meenemen.push({ id: `evt-${event.id}-${pack}`, label: pack, detail: event.title });
      }
    }
  }

  for (const party of snapshot.parties.filter((row) => handover.childIds.includes(row.forChildId))) {
    const event = snapshot.events.find((item) => item.id === party.eventId && item.startsAt.slice(0, 10) === date);
    if (event) {
      belangrijk.push({ id: party.id, label: event.title, detail: party.address ?? undefined });
      const gift = party.giftNeededItemId
        ? snapshot.neededItems.find((item) => item.id === party.giftNeededItemId)
        : null;
      if (gift && gift.status !== "gekocht") {
        meenemen.push({
          id: gift.id,
          label: gift.title,
          detail: neededHeadline(gift, snapshot),
        });
      }
    }
  }

  for (const item of neededForHandover(snapshot, handover)) {
    if (!meenemen.some((row) => row.id === item.id)) meenemen.push(item);
  }

  for (const task of snapshot.tasks.filter(
    (item) =>
      item.kind === "one_off" &&
      item.status !== "done" &&
      item.childId &&
      handover.childIds.includes(item.childId) &&
      item.dueAt?.slice(0, 10) === date,
  )) {
    belangrijk.push({
      id: task.id,
      label: task.title,
      detail: task.assigneeMemberId ? `${parentName(snapshot, task.assigneeMemberId)} regelt dit` : undefined,
    });
  }

  const pickupMember = handover.pickupMemberId ?? handover.toMemberId;
  ophalen.push({
    id: "pickup-who",
    label: parentName(snapshot, pickupMember),
    detail: `${handover.time}${handover.location ? ` · ${handover.location}` : ""}`,
  });

  const childUpdates = snapshot.childUpdates
    .filter((item) => handover.childIds.includes(item.childId))
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      label: item.body.slice(0, 80),
      detail: parentName(snapshot, item.authorMemberId),
    }));

  return { handover, meenemen, belangrijk, ophalen, childUpdates };
}

export function handoverIsSoon(handover: Handover, today: string): boolean {
  const tomorrow = toISODate(addDays(new Date(`${today}T12:00:00`), 1));
  return handover.date === today || handover.date === tomorrow;
}

export function handoverSummaryLine(snapshot: FamilySnapshot, handover: Handover): string {
  const when =
    handover.date === toISODate(new Date())
      ? `vandaag ${handover.time}`
      : `${formatDayLong(handover.date)} · ${handover.time}`;
  return `${handoverLine(snapshot, handover)} · ${childNames(snapshot, handover.childIds)} · ${when}`;
}

export function childAtHandover(snapshot: FamilySnapshot, handover: Handover, childId: string): string {
  const before = custodianForChild(snapshot, handover.date, childId);
  if (before === handover.fromMemberId) {
    return `Gaat naar ${parentName(snapshot, handover.toMemberId).toLowerCase()}`;
  }
  return childNames(snapshot, [childId]);
}
