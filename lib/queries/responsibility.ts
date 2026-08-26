import { formatTime } from "@/lib/dates";
import { parentName } from "@/lib/queries/family-view";
import type { CalendarEvent, FamilySnapshot, NeededItem, TaskItem } from "@/lib/domain/types";

export function wieBrengt(snapshot: FamilySnapshot, memberId: string | null | undefined): string {
  if (!memberId) return "Nog niet ingevuld";
  return memberId === snapshot.currentMember.id
    ? "Jij brengt"
    : `${parentName(snapshot, memberId)} brengt`;
}

export function wieHaalt(snapshot: FamilySnapshot, memberId: string | null | undefined): string {
  if (!memberId) return "Nog niet ingevuld";
  return memberId === snapshot.currentMember.id
    ? "Jij haalt op"
    : `${parentName(snapshot, memberId)} haalt op`;
}

export function wieRegelt(snapshot: FamilySnapshot, memberId: string | null | undefined): string {
  if (!memberId) return "Nog niet toegewezen";
  return memberId === snapshot.currentMember.id
    ? "Jij regelt dit"
    : `${parentName(snapshot, memberId)} regelt dit`;
}

export function wieKoopt(snapshot: FamilySnapshot, item: NeededItem): string {
  if (item.status === "gekocht") {
    const who = item.purchasedByMemberId ? parentName(snapshot, item.purchasedByMemberId) : "een ouder";
    return `Gekocht door ${who}`;
  }
  return wieRegelt(snapshot, item.assigneeMemberId);
}

export function wieBetaalt(snapshot: FamilySnapshot, memberId: string | null | undefined): string {
  if (!memberId) return "Nog niet ingevuld";
  return memberId === snapshot.currentMember.id
    ? "Jij betaalt"
    : `${parentName(snapshot, memberId)} betaalt`;
}

export function wieNeemtMee(snapshot: FamilySnapshot, memberId: string | null | undefined, items: string[]): string {
  if (!items.length) return "";
  const who = memberId
    ? memberId === snapshot.currentMember.id
      ? "Jij neemt mee"
      : `${parentName(snapshot, memberId)} neemt mee`
    : "Meenemen";
  return `${who}: ${items.join(", ")}`;
}

export function eventResponsibilityLines(snapshot: FamilySnapshot, event: CalendarEvent): string[] {
  const lines: string[] = [];
  if (event.dropoffMemberId) lines.push(wieBrengt(snapshot, event.dropoffMemberId));
  if (event.pickupMemberId) lines.push(wieHaalt(snapshot, event.pickupMemberId));
  if (event.packingList.length) {
    const carrier = event.pickupMemberId ?? event.dropoffMemberId ?? event.memberIds[0];
    lines.push(wieNeemtMee(snapshot, carrier, event.packingList));
  }
  return lines;
}

export function taskResponsibilityLine(snapshot: FamilySnapshot, task: TaskItem): string {
  return wieRegelt(snapshot, task.assigneeMemberId);
}

export function timelineItemLine(snapshot: FamilySnapshot, event: CalendarEvent): string {
  if (/ophalen/i.test(event.title)) {
    const assigned = event.pickupMemberId ?? event.memberIds[0];
    return wieHaalt(snapshot, assigned);
  }
  if (event.dropoffMemberId || event.pickupMemberId) {
    const parts = [];
    if (event.dropoffMemberId) parts.push(wieBrengt(snapshot, event.dropoffMemberId));
    if (event.pickupMemberId) parts.push(wieHaalt(snapshot, event.pickupMemberId));
    return parts.join(" · ");
  }
  if (event.category === "school" && event.schoolKind !== "studiedag") {
    return formatTime(event.startsAt);
  }
  return event.location ?? "";
}
