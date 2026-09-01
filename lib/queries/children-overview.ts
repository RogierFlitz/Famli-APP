import { addDays } from "date-fns";
import { formatDayShort, formatTime, toISODate } from "@/lib/dates";
import { custodianForChild } from "@/lib/calendar/helpers";
import { childAge, nextHandoverForChild, overnightMemberId, parentName } from "@/lib/queries/family-view";
import { compactStayLine, forgetNot } from "@/lib/queries/child-life";
import { upcomingPackingForChild } from "@/lib/queries/packing";
import { wieBrengt } from "@/lib/queries/responsibility";
import { uniqueById } from "@/lib/family/unique";
import { canManageMembers, isParentMember } from "@/lib/members/permissions";
import type { CalendarEvent, Child, FamilySnapshot, Handover } from "@/lib/domain/types";

export type ChildOverviewCard = {
  child: Child;
  ageLabel: string | null;
  stayHeadline: string;
  stayUntil: string | null;
  needsSchedule: boolean;
  todayEvent: { time: string | null; title: string; who: string | null } | null;
  nextHandover: { when: string; toLabel: string } | null;
  handoverToday: Handover | null;
  attention: string[];
  href: string;
  hasActionToday: boolean;
};

export type ChildrenOverview = {
  cards: ChildOverviewCard[];
  canAddChild: boolean;
  summary: { children: number; handoversToday: number; toArrange: number };
};

function parentLabel(snapshot: FamilySnapshot, memberId: string) {
  const member = snapshot.members.find((item) => item.id === memberId);
  if (!member) return parentName(snapshot, memberId);
  if (memberId === snapshot.currentMember.id) return "jou";
  return member.parentLabel || parentName(snapshot, memberId);
}

function eventsForChildOnDate(snapshot: FamilySnapshot, childId: string, date: string): CalendarEvent[] {
  return snapshot.events
    .filter(
      (event) =>
        !event.cancelledAt &&
        event.childIds.includes(childId) &&
        event.startsAt.startsWith(date) &&
        event.category !== "overdracht",
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function pickTodayEvent(snapshot: FamilySnapshot, childId: string, date: string): CalendarEvent | null {
  const events = eventsForChildOnDate(snapshot, childId, date);
  const notable = events.find((event) => event.title !== "School" && event.category !== "school");
  return notable ?? events[0] ?? null;
}

function stayStatus(snapshot: FamilySnapshot, child: Child, now: Date) {
  const today = toISODate(now);
  const handoverToday =
    snapshot.handovers.find(
      (item) => !item.cancelledAt && item.date === today && item.childIds.includes(child.id),
    ) ?? null;
  const memberId = custodianForChild(snapshot, today, child.id) ?? overnightMemberId(snapshot, today);
  const needsSchedule = !snapshot.schedule && !memberId;

  if (!memberId) {
    return {
      stayHeadline: "Verblijfsschema nog niet ingesteld.",
      stayUntil: null as string | null,
      needsSchedule: true,
      handoverToday,
    };
  }

  const who = parentLabel(snapshot, memberId);
  const stayHeadline = who === "jou" ? "Vandaag bij jou" : `Vandaag bij ${who}`;
  const compact = compactStayLine(snapshot, child, now);
  const tot = compact.toLowerCase().lastIndexOf(" tot ");
  const stayUntil = tot >= 0 ? `Tot ${compact.slice(tot + 5)}` : null;

  return { stayHeadline, stayUntil, needsSchedule, handoverToday };
}

function attentionForChild(snapshot: FamilySnapshot, child: Child, now: Date, _todayEvent: CalendarEvent | null) {
  const today = toISODate(now);
  const lines: string[] = [];
  const packing = upcomingPackingForChild(snapshot, child.id, now, 2)[0];
  if (packing) lines.push(packing.progressLabel);

  const needed = forgetNot(snapshot, now).find((item) => item.childId === child.id);
  if (needed && lines.length < 2) lines.push(needed.title);

  const handover = snapshot.handovers.find(
    (item) => !item.cancelledAt && item.date === today && item.childIds.includes(child.id),
  );
  if (handover && lines.length < 2 && !packing) {
    lines.push(`Wissel om ${handover.time}`);
  }

  return lines.slice(0, 2);
}

function handoverLine(snapshot: FamilySnapshot, handover: Handover, today: string) {
  const when =
    handover.date === today
      ? `Vandaag · ${handover.time}`
      : handover.date === toISODate(addDays(parseISOSafe(today), 1))
        ? `Morgen · ${handover.time}`
        : `${formatDayShort(handover.date)} · ${handover.time}`;
  const toLabel = parentLabel(snapshot, handover.toMemberId);
  return { when, toLabel: toLabel === "jou" ? "jou" : toLabel };
}

function parseISOSafe(date: string) {
  return new Date(`${date}T12:00:00`);
}

export function childAgeLabel(child: Child, now = new Date()): string | null {
  if (!child.dateOfBirth) return null;
  const age = childAge(child, now);
  if (!Number.isFinite(age) || age < 0) return null;
  return `${age} jaar`;
}

export function canAddChild(snapshot: FamilySnapshot): boolean {
  return isParentMember(snapshot.currentMember) || canManageMembers(snapshot);
}

export function childrenOverview(snapshot: FamilySnapshot, now = new Date()): ChildrenOverview {
  const today = toISODate(now);
  const children = uniqueById(snapshot.children);
  const cards: ChildOverviewCard[] = children.map((child) => {
    const stay = stayStatus(snapshot, child, now);
    const event = pickTodayEvent(snapshot, child.id, today);
    const handover = stay.handoverToday ?? nextHandoverForChild(snapshot, child.id, today) ?? null;
    const attention = attentionForChild(snapshot, child, now, event);
    const hasActionToday = Boolean(stay.handoverToday || event || attention.length);

    return {
      child,
      ageLabel: childAgeLabel(child, now),
      stayHeadline: stay.stayHeadline,
      stayUntil: stay.needsSchedule ? null : stay.stayUntil,
      needsSchedule: stay.needsSchedule,
      todayEvent: event
        ? {
            time: event.allDay ? null : formatTime(event.startsAt),
            title: event.title,
            who: event.dropoffMemberId ? wieBrengt(snapshot, event.dropoffMemberId) : null,
          }
        : null,
      nextHandover: handover ? handoverLine(snapshot, handover, today) : null,
      handoverToday: stay.handoverToday,
      attention,
      href: `/kinderen/${child.id}`,
      hasActionToday,
    };
  });

  cards.sort((a, b) => {
    if (a.hasActionToday !== b.hasActionToday) return a.hasActionToday ? -1 : 1;
    return a.child.createdAt.localeCompare(b.child.createdAt) || a.child.firstName.localeCompare(b.child.firstName, "nl");
  });

  const handoversToday = uniqueById(
    snapshot.handovers.filter((item) => !item.cancelledAt && item.date === today),
  ).length;
  const toArrange = cards.reduce((sum, card) => sum + card.attention.length, 0);

  return {
    cards,
    canAddChild: canAddChild(snapshot),
    summary: {
      children: cards.length,
      handoversToday,
      toArrange,
    },
  };
}
