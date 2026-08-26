import type { CalendarFilterState } from "@/lib/calendar/helpers";
import type { FamilySnapshot, PersonalCalendarEvent } from "@/lib/domain/types";

export function personalEventsOn(
  snapshot: FamilySnapshot,
  date: string,
  filters: CalendarFilterState,
): PersonalCalendarEvent[] {
  return (snapshot.personalCalendarEvents ?? [])
    .filter((event) => event.startsAt.startsWith(date))
    .filter((event) => matchesPersonalEventFilters(snapshot, event, filters));
}

function matchesPersonalEventFilters(
  snapshot: FamilySnapshot,
  event: PersonalCalendarEvent,
  filters: CalendarFilterState,
): boolean {
  if (filters.types.length) return false;
  if (filters.quickFilter !== "all") {
    const member = snapshot.members.find((item) => item.id === filters.quickFilter);
    if (member && member.userId !== event.userId) return false;
    const child = snapshot.children.find((item) => item.id === filters.quickFilter);
    if (child) return false;
  }
  if (filters.memberIds.length) {
    const member = snapshot.members.find((item) => item.userId === event.userId);
    if (!member || !filters.memberIds.includes(member.id)) return false;
  }
  if (filters.childIds.length) return false;
  return true;
}

export function providerBadgeLabel(provider: PersonalCalendarEvent["provider"]): string {
  if (provider === "google") return "Google";
  if (provider === "microsoft") return "Outlook";
  return "ICS";
}
