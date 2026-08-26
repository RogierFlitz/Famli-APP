import { addDays, differenceInYears, parseISO } from "date-fns";
import { formatDayLong, formatTime, toISODate } from "@/lib/dates";
import { memberLabel } from "@/lib/custody/generate";
import { balanceForMember } from "@/lib/costs/balance";
import { formatEuro } from "@/lib/money";
import { changeRequestLabel } from "@/lib/domain/labels";
import type {
  CalendarEvent,
  ChangeRequest,
  Child,
  FamilySnapshot,
  Handover,
} from "@/lib/domain/types";

export type EventKind = "verblijf" | "kind" | "gezin" | "wissel";

export type UrgentAction = {
  id: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  kind: "change" | "expense" | "task" | "needed" | "school";
};

export function otherParent(snapshot: FamilySnapshot) {
  return snapshot.members.find((member) => member.id !== snapshot.currentMember.id) ?? snapshot.members[0];
}

export function parentName(snapshot: FamilySnapshot, memberId: string) {
  const member = snapshot.members.find((item) => item.id === memberId);
  if (!member) return "ouder";
  const profile = member.userId ? snapshot.profiles[member.userId] : null;
  return profile?.firstName ?? member.parentLabel;
}

export function childNames(snapshot: FamilySnapshot, childIds?: string[]) {
  const list = childIds?.length
    ? snapshot.children.filter((child) => childIds.includes(child.id))
    : snapshot.children;
  return list.map((child) => child.firstName).join(" & ");
}

export function childAge(child: Child, now = new Date()) {
  return differenceInYears(now, parseISO(child.dateOfBirth));
}

export function occurrenceOn(snapshot: FamilySnapshot, date: string) {
  return snapshot.occurrences.find((item) => item.date === date);
}

export function handoverOn(snapshot: FamilySnapshot, date: string) {
  return snapshot.handovers.find((item) => item.date === date && !item.cancelledAt);
}

export function overnightMemberId(snapshot: FamilySnapshot, date: string) {
  const handover = handoverOn(snapshot, date);
  if (handover) return handover.toMemberId;
  return occurrenceOn(snapshot, date)?.custodianMemberId ?? null;
}

export function todayStay(snapshot: FamilySnapshot, date: string) {
  const memberId = overnightMemberId(snapshot, date);
  if (!memberId) {
    return { withMe: false, text: "Verblijf is nog niet ingepland", memberId: null as string | null };
  }
  const withMe = memberId === snapshot.currentMember.id;
  return {
    withMe,
    memberId,
    text: withMe
      ? `${childNames(snapshot)} ${snapshot.children.length === 1 ? "is" : "zijn"} vandaag bij jou`
      : `${childNames(snapshot)} ${snapshot.children.length === 1 ? "is" : "zijn"} vandaag bij ${parentName(snapshot, memberId).toLowerCase()}`,
  };
}

export function nextHandover(snapshot: FamilySnapshot, fromDate: string) {
  return snapshot.handovers
    .filter((item) => !item.cancelledAt && item.date >= fromDate)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
}

export function upcomingHandovers(snapshot: FamilySnapshot, fromDate: string, limit = 6) {
  return snapshot.handovers
    .filter((item) => !item.cancelledAt && item.date >= fromDate)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, limit);
}

export function eventsOn(snapshot: FamilySnapshot, date: string, filterId?: string | null) {
  return snapshot.events
    .filter((event) => !event.cancelledAt && event.startsAt.startsWith(date))
    .filter((event) => matchesFilter(snapshot, event, filterId))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function matchesFilter(snapshot: FamilySnapshot, event: CalendarEvent, filterId?: string | null) {
  if (!filterId || filterId === "all") return true;
  if (snapshot.children.some((child) => child.id === filterId)) {
    return event.childIds.includes(filterId) || event.category === "overdracht";
  }
  if (snapshot.members.some((member) => member.id === filterId)) {
    if (event.memberIds.includes(filterId)) return true;
    const date = event.startsAt.slice(0, 10);
    const occ = occurrenceOn(snapshot, date);
    const handover = handoverOn(snapshot, date);
    return occ?.custodianMemberId === filterId || handover?.fromMemberId === filterId || handover?.toMemberId === filterId;
  }
  return true;
}

export function eventKind(event: CalendarEvent): EventKind {
  if (event.category === "overdracht") return "wissel";
  if (event.category === "verblijf") return "verblijf";
  if (event.category === "vakantie" || event.category === "verjaardag" || event.category === "feestje") return "gezin";
  return "kind";
}

export function eventHref(event: CalendarEvent) {
  const date = event.startsAt.slice(0, 10);
  if (event.handoverId) return `/agenda?date=${date}&focus=${event.id}&view=wissels`;
  return `/agenda?date=${date}&focus=${event.id}`;
}

export function handoverHref(handover: Handover) {
  return `/agenda?date=${handover.date}&focus=${handover.eventId ?? handover.id}&view=wissels`;
}

export function changeHref(request: ChangeRequest) {
  return `/regelen?tab=verzoeken&id=${request.id}`;
}

export function pendingChangeForDate(snapshot: FamilySnapshot, date: string) {
  return snapshot.changeRequests.find(
    (item) => item.targetDate === date && (item.status === "pending" || item.status === "alternative_proposed"),
  );
}

export function incomingChanges(snapshot: FamilySnapshot) {
  return snapshot.changeRequests.filter(
    (item) =>
      (item.status === "pending" || item.status === "alternative_proposed") &&
      item.requestedByMemberId !== snapshot.currentMember.id,
  );
}

export function myOpenSplits(snapshot: FamilySnapshot) {
  return snapshot.splits.filter((split) => {
    const expense = snapshot.expenses.find((item) => item.id === split.expenseId && !item.voidedAt);
    return (
      split.status === "pending" &&
      split.memberId === snapshot.currentMember.id &&
      expense &&
      expense.paidByMemberId !== snapshot.currentMember.id
    );
  });
}

export function urgentActions(snapshot: FamilySnapshot, now = new Date()): UrgentAction[] {
  const actions: UrgentAction[] = [];

  for (const request of incomingChanges(snapshot)) {
    const from = parentName(snapshot, request.requestedByMemberId);
    actions.push({
      id: request.id,
      title: `${from} stelt een wijziging voor`,
      detail: `${formatDayLong(request.targetDate)} · ${changeRequestLabel[request.type]}`,
      href: changeHref(request),
      cta: "Bekijk verzoek",
      kind: "change",
    });
  }

  for (const split of myOpenSplits(snapshot).sort((a, b) => b.shareCents - a.shareCents).slice(0, 1)) {
    const expense = snapshot.expenses.find((item) => item.id === split.expenseId);
    if (!expense) continue;
    actions.push({
      id: split.id,
      title: `${formatEuro(split.shareCents)} ${expense.description.toLowerCase()}`,
      detail: `Betaald door ${parentName(snapshot, expense.paidByMemberId)}`,
      href: `/kosten?id=${expense.id}`,
      cta: "Beoordelen",
      kind: "expense",
    });
  }

  const soon = toISODate(addDays(now, 21));
  const today = toISODate(now);
  for (const task of snapshot.tasks.filter((item) => item.status !== "done")) {
    const due = task.dueAt?.slice(0, 10);
    const mine = !task.assigneeMemberId || task.assigneeMemberId === snapshot.currentMember.id;
    const urgent = Boolean(due && due <= soon);
    if (!mine && !/paspoort/i.test(task.title)) continue;
    if (!urgent && !/paspoort/i.test(task.title)) continue;
    actions.push({
      id: task.id,
      title: /paspoort/i.test(task.title) ? task.title.replace("vernieuwen", "verloopt binnenkort") : task.title,
      detail: due && due >= today ? `Voor ${formatDayLong(due)}` : task.description ?? "",
      href: `/regelen?tab=taken&id=${task.id}`,
      cta: "Bekijken",
      kind: "task",
    });
  }

  for (const item of snapshot.neededItems.filter((row) => row.status === "nodig" || (row.status === "wordt_geregeld" && row.assigneeMemberId === snapshot.currentMember.id))) {
    const child = snapshot.children.find((row) => row.id === item.childId);
    actions.push({
      id: item.id,
      title: item.title,
      detail: [child?.firstName, item.size ? `maat ${item.size}` : null].filter(Boolean).join(" · "),
      href: `/regelen?tab=nodig`,
      cta: item.assigneeMemberId === snapshot.currentMember.id ? "Afronden" : "Regelen",
      kind: "needed",
    });
  }

  for (const event of snapshot.events.filter(
    (item) => !item.cancelledAt && item.schoolKind === "studiedag" && item.startsAt.slice(0, 10) >= today && item.startsAt.slice(0, 10) <= soon,
  )) {
    const child = snapshot.children.find((row) => event.childIds.includes(row.id));
    const night = overnightMemberId(snapshot, event.startsAt.slice(0, 10));
    actions.push({
      id: event.id,
      title: "Studiedag regelen",
      detail: `${child?.firstName ?? "Kind"} · ${formatDayLong(event.startsAt)}${night ? "" : " · nog niet geregeld"}`,
      href: `/agenda?date=${event.startsAt.slice(0, 10)}&focus=${event.id}`,
      cta: "Regelen",
      kind: "school",
    });
  }

  return actions.slice(0, 6);
}

export function nextEventForChild(snapshot: FamilySnapshot, childId: string, fromDate: string) {
  const stamp = new Date().toISOString().slice(0, 16);
  return snapshot.events
    .filter(
      (event) =>
        !event.cancelledAt &&
        event.endsAt.slice(0, 16) >= stamp &&
        event.startsAt.slice(0, 10) >= fromDate &&
        (event.childIds.includes(childId) || event.category === "overdracht") &&
        event.title !== "School",
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? snapshot.events
    .filter(
      (event) =>
        !event.cancelledAt &&
        event.startsAt.slice(0, 10) >= fromDate &&
        event.childIds.includes(childId) &&
        event.title === "School" &&
        event.startsAt.slice(0, 16) > stamp,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
}

export function nextHandoverForChild(snapshot: FamilySnapshot, childId: string, fromDate: string) {
  return snapshot.handovers
    .filter((item) => !item.cancelledAt && item.date >= fromDate && item.childIds.includes(childId))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
}

export function costHeadline(snapshot: FamilySnapshot) {
  const net = balanceForMember(snapshot.expenses, snapshot.splits, snapshot.currentMember.id);
  const other = otherParent(snapshot);
  const otherName = parentName(snapshot, other.id);
  if (net > 0) {
    return {
      title: `Jij krijgt ${formatEuro(net)}`,
      subtitle: `${otherName} heeft ${formatEuro(net)} openstaan`,
      net,
    };
  }
  if (net < 0) {
    return {
      title: `Jij moet ${formatEuro(Math.abs(net))} betalen`,
      subtitle: `Openstaand aan ${otherName.toLowerCase()}`,
      net,
    };
  }
  return { title: "Jullie staan gelijk", subtitle: "Geen openstaande verdeling", net };
}

export function handoverLine(snapshot: FamilySnapshot, handover: Handover) {
  return `${parentName(snapshot, handover.fromMemberId)} → ${parentName(snapshot, handover.toMemberId)}`;
}

export function pickupLine(snapshot: FamilySnapshot, event: CalendarEvent, memberId: string) {
  const assigned = event.memberIds[0];
  if (!assigned) return event.location ?? "";
  return assigned === memberId ? "Jij haalt op" : `${parentName(snapshot, assigned)} haalt op`;
}

export function formatEventTime(event: CalendarEvent) {
  return event.allDay ? "Hele dag" : formatTime(event.startsAt);
}

export function memberColor(snapshot: FamilySnapshot, memberId: string | null | undefined) {
  return snapshot.members.find((member) => member.id === memberId)?.displayColor;
}
