import { formatTime, toISODate } from "@/lib/dates";
import { parentName } from "@/lib/queries/family-view";
import { wieBrengt, wieHaalt } from "@/lib/queries/responsibility";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";

export type BringHaalItem = {
  id: string;
  title: string;
  time: string;
  childNames: string;
  location: string | null;
  bringLabel: string;
  haulLabel: string;
  stayLabel: string | null;
  href: string;
};

function childNamesFor(snapshot: FamilySnapshot, event: CalendarEvent): string {
  return snapshot.children
    .filter((child) => event.childIds.includes(child.id))
    .map((child) => child.firstName)
    .join(" & ");
}

export function bringHaalToday(snapshot: FamilySnapshot, date = toISODate(new Date())): BringHaalItem[] {
  return snapshot.events
    .filter(
      (event) =>
        !event.cancelledAt &&
        event.startsAt.startsWith(date) &&
        event.category !== "overdracht" &&
        (event.dropoffMemberId || event.pickupMemberId),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((event) => ({
      id: event.id,
      title: event.title,
      time: event.allDay ? "Hele dag" : formatTime(event.startsAt),
      childNames: childNamesFor(snapshot, event) || "Gezin",
      location: event.location,
      bringLabel: event.dropoffMemberId ? wieBrengt(snapshot, event.dropoffMemberId) : "Brengen: nog open",
      haulLabel: event.pickupMemberId ? wieHaalt(snapshot, event.pickupMemberId) : "Halen: nog open",
      stayLabel: stayLabelForEvent(snapshot, event),
      href: `/agenda?date=${date}&focus=${event.id}`,
    }));
}

export function nextAppointment(snapshot: FamilySnapshot, date = toISODate(new Date())) {
  return snapshot.events
    .filter((event) => !event.cancelledAt && event.startsAt.slice(0, 10) >= date && event.category !== "overdracht")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
}

export function openChangeRequests(snapshot: FamilySnapshot) {
  return snapshot.changeRequests.filter(
    (item) => item.status === "pending" || item.status === "alternative_proposed",
  );
}

export function stayLabel(snapshot: FamilySnapshot, memberId: string | null | undefined): string {
  if (!memberId) return "Nog niet ingevuld";
  if (memberId === snapshot.currentMember.id) return "Jij blijft erbij";
  return `${parentName(snapshot, memberId)} blijft erbij`;
}

function stayLabelForEvent(snapshot: FamilySnapshot, event: CalendarEvent): string | null {
  const activity = (snapshot.childActivities ?? []).find(
    (item) =>
      item.active &&
      item.title === event.title &&
      event.childIds.includes(item.childId) &&
      item.stayMemberId,
  );
  return activity?.stayMemberId ? stayLabel(snapshot, activity.stayMemberId) : null;
}
