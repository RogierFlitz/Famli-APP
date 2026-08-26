import type { CSSProperties } from "react";
import type { CalendarEvent, FamilySnapshot, TaskItem } from "@/lib/domain/types";
import { memberColor, parentName } from "@/lib/queries/family-view";

export type EventTypeFilter = "school" | "sport" | "feestjes" | "reizen" | "wissels" | "taken";

export type CalendarFilterState = {
  quickFilter: "all" | string;
  childIds: string[];
  memberIds: string[];
  types: EventTypeFilter[];
  showRoutines: boolean;
};

export const DEFAULT_FILTERS: CalendarFilterState = {
  quickFilter: "all",
  childIds: [],
  memberIds: [],
  types: [],
  showRoutines: true,
};

export type CustodyAssignment = {
  childId: string;
  childName: string;
  memberId: string;
  memberName: string;
  color: string;
};

export type CustodyState =
  | { kind: "none" }
  | { kind: "single"; memberId: string; memberName: string; color: string }
  | { kind: "split"; assignments: CustodyAssignment[] };

export function custodianForChild(snapshot: FamilySnapshot, date: string, childId: string): string | null {
  const specific = snapshot.occurrences.find((item) => item.date === date && item.childId === childId);
  if (specific) return specific.custodianMemberId;
  const shared = snapshot.occurrences.find((item) => item.date === date && item.childId === null);
  return shared?.custodianMemberId ?? null;
}

export function custodyStateForDate(snapshot: FamilySnapshot, date: string): CustodyState {
  const assignments: CustodyAssignment[] = snapshot.children
    .map((child) => {
      const memberId = custodianForChild(snapshot, date, child.id);
      if (!memberId) return null;
      return {
        childId: child.id,
        childName: child.firstName,
        memberId,
        memberName: parentName(snapshot, memberId),
        color: memberColor(snapshot, memberId) ?? "#94a3b8",
      };
    })
    .filter(Boolean) as CustodyAssignment[];

  if (!assignments.length) return { kind: "none" };
  const uniqueMembers = new Set(assignments.map((item) => item.memberId));
  if (uniqueMembers.size === 1) {
    const first = assignments[0];
    return { kind: "single", memberId: first.memberId, memberName: first.memberName, color: first.color };
  }
  return { kind: "split", assignments };
}

export function custodyBackgroundStyle(state: CustodyState): CSSProperties {
  if (state.kind === "single") {
    return { backgroundColor: `${state.color}12` };
  }
  if (state.kind === "split" && state.assignments.length >= 2) {
    const left = state.assignments[0].color;
    const right = state.assignments[state.assignments.length - 1].color;
    return { background: `linear-gradient(to right, ${left}12 50%, ${right}12 50%)` };
  }
  return {};
}

export function isRoutineEvent(event: CalendarEvent): boolean {
  if (event.category === "overdracht") return false;
  if (event.category === "school" && (!event.schoolKind || event.schoolKind === "les")) return true;
  if (event.category === "opvang") return true;
  if (event.category === "sport" && !/wedstrijd/i.test(event.title)) return true;
  if (event.category === "verblijf") return true;
  return false;
}

export function isImportantEvent(event: CalendarEvent): boolean {
  if (event.category === "overdracht") return true;
  if (event.schoolKind && ["studiedag", "schoolreis", "ouderavond"].includes(event.schoolKind)) return true;
  if (event.category === "feestje" || event.category === "verjaardag") return true;
  if (event.category === "sport" && /wedstrijd/i.test(event.title)) return true;
  if (event.category === "medisch") return true;
  if (event.category === "vakantie") return true;
  return false;
}

export function eventMatchesTypeFilter(event: CalendarEvent, types: EventTypeFilter[]): boolean {
  if (!types.length) return true;
  return types.some((type) => {
    if (type === "school") return event.category === "school";
    if (type === "sport") return event.category === "sport";
    if (type === "feestjes") return event.category === "feestje" || event.category === "verjaardag";
    if (type === "reizen") return event.category === "vakantie";
    if (type === "wissels") return event.category === "overdracht";
    if (type === "taken") return false;
    return false;
  });
}

export function matchesCalendarFilters(
  snapshot: FamilySnapshot,
  event: CalendarEvent,
  filters: CalendarFilterState,
  date?: string,
): boolean {
  if (filters.quickFilter !== "all") {
    const isChild = snapshot.children.some((child) => child.id === filters.quickFilter);
    if (isChild && !event.childIds.includes(filters.quickFilter) && event.category !== "overdracht") {
      return false;
    }
    if (!isChild) {
      const isMember = snapshot.members.some((member) => member.id === filters.quickFilter);
      if (isMember) {
        const eventDate = date ?? event.startsAt.slice(0, 10);
        const occ = snapshot.occurrences.find((item) => item.date === eventDate);
        const handover = snapshot.handovers.find((item) => item.date === eventDate && !item.cancelledAt);
        const memberMatch =
          event.memberIds.includes(filters.quickFilter) ||
          occ?.custodianMemberId === filters.quickFilter ||
          handover?.fromMemberId === filters.quickFilter ||
          handover?.toMemberId === filters.quickFilter;
        if (!memberMatch && !event.childIds.length) return false;
        if (!memberMatch && event.childIds.length && !event.memberIds.includes(filters.quickFilter)) return false;
      }
    }
  }

  if (filters.childIds.length && !event.childIds.some((id) => filters.childIds.includes(id)) && event.category !== "overdracht") {
    return false;
  }

  if (filters.memberIds.length) {
    const eventDate = date ?? event.startsAt.slice(0, 10);
    const memberMatch =
      event.memberIds.some((id) => filters.memberIds.includes(id)) ||
      filters.memberIds.some((id) => custodianForChild(snapshot, eventDate, snapshot.children[0]?.id ?? "") === id);
    if (!memberMatch && event.category !== "overdracht") return false;
  }

  if (filters.types.length && !eventMatchesTypeFilter(event, filters.types)) {
    return false;
  }

  if (!filters.showRoutines && isRoutineEvent(event) && !isImportantEvent(event)) {
    return false;
  }

  return true;
}

export function filteredEventsOn(snapshot: FamilySnapshot, date: string, filters: CalendarFilterState): CalendarEvent[] {
  return snapshot.events
    .filter((event) => !event.cancelledAt && event.startsAt.startsWith(date))
    .filter((event) => matchesCalendarFilters(snapshot, event, filters, date))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function typesAllowTasks(filters: CalendarFilterState): boolean {
  return !filters.types.length || filters.types.includes("taken");
}

export function taskMatchesFilters(
  snapshot: FamilySnapshot,
  task: TaskItem,
  filters: CalendarFilterState,
  date: string,
): boolean {
  if (task.status === "done") return false;
  if (task.dueAt?.slice(0, 10) !== date) return false;
  if (!typesAllowTasks(filters)) return false;

  if (filters.quickFilter !== "all") {
    const isChild = snapshot.children.some((child) => child.id === filters.quickFilter);
    if (isChild && task.childId !== filters.quickFilter) return false;
    if (!isChild) {
      const isMember = snapshot.members.some((member) => member.id === filters.quickFilter);
      if (isMember && task.assigneeMemberId !== filters.quickFilter) return false;
    }
  }

  if (filters.childIds.length && (!task.childId || !filters.childIds.includes(task.childId))) {
    return false;
  }

  if (filters.memberIds.length && (!task.assigneeMemberId || !filters.memberIds.includes(task.assigneeMemberId))) {
    return false;
  }

  return true;
}

export function filteredTasksOn(snapshot: FamilySnapshot, date: string, filters: CalendarFilterState): TaskItem[] {
  return snapshot.tasks
    .filter((task) => taskMatchesFilters(snapshot, task, filters, date))
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
}

export function onlyTasksFilterActive(filters: CalendarFilterState): boolean {
  return filters.types.length === 1 && filters.types[0] === "taken";
}

export function parentMembers(snapshot: FamilySnapshot) {
  return snapshot.members.filter((member) => member.role === "owner" || member.role === "parent");
}

export function filtersAreActive(filters: CalendarFilterState): boolean {
  return (
    filters.childIds.length > 0 ||
    filters.memberIds.length > 0 ||
    filters.types.length > 0 ||
    !filters.showRoutines
  );
}

export function eventDisplayPriority(event: CalendarEvent): number {
  if (event.category === "overdracht") return 0;
  if (isImportantEvent(event)) return 1;
  if (isRoutineEvent(event)) return 3;
  return 2;
}

export function sortEventsForCell(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const priority = eventDisplayPriority(a) - eventDisplayPriority(b);
    if (priority !== 0) return priority;
    return a.startsAt.localeCompare(b.startsAt);
  });
}
