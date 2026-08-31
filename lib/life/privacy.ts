import type { FamilySnapshot } from "@/lib/domain/types";
import {
  canViewExpenses,
  canViewMedical,
  childAccessForMember,
  memberPermissions,
  visibleChildren,
} from "@/lib/members/permissions";

export function emptyLifeFields(): Pick<
  FamilySnapshot,
  | "sizes"
  | "sizeHistory"
  | "neededItems"
  | "parties"
  | "schools"
  | "clubs"
  | "travelPlans"
  | "travelSegments"
  | "childUpdates"
  | "contextMessages"
  | "importJobs"
  | "externalBusyBlocks"
  | "personalCalendarEvents"
  | "guestLinkTokens"
  | "handoverCheckIns"
  | "households"
  | "childMemberAccess"
  | "routineOccurrences"
  | "shoppingLists"
  | "shoppingItems"
  | "childActivities"
  | "childContacts"
> {
  return {
    sizes: [],
    sizeHistory: [],
    neededItems: [],
    parties: [],
    schools: [],
    clubs: [],
    travelPlans: [],
    travelSegments: [],
    childUpdates: [],
    contextMessages: [],
    importJobs: [],
    externalBusyBlocks: [],
    personalCalendarEvents: [],
    guestLinkTokens: [],
    handoverCheckIns: [],
    households: [],
    childMemberAccess: [],
    routineOccurrences: [],
    shoppingLists: [],
    shoppingItems: [],
    childActivities: [],
    childContacts: [],
  };
}

export function applyPrivacy(snapshot: FamilySnapshot): FamilySnapshot {
  const perms = memberPermissions(snapshot.currentMember);
  const visibleChildIds = new Set(visibleChildren(snapshot).map((child) => child.id));

  const filtered = {
    ...snapshot,
    children: snapshot.children.filter((child) => visibleChildIds.has(child.id)),
    events: perms.viewCalendar
      ? snapshot.events.filter(
          (event) =>
            !event.childIds.length || event.childIds.some((childId) => visibleChildIds.has(childId)),
        )
      : [],
    handovers: perms.viewCustody ? snapshot.handovers : [],
    occurrences: perms.viewCustody ? snapshot.occurrences : [],
    changeRequests: perms.acceptChangeRequests ? snapshot.changeRequests : [],
    expenses: canViewExpenses(snapshot) ? snapshot.expenses : [],
    splits: canViewExpenses(snapshot) ? snapshot.splits : [],
    recurringExpenses: canViewExpenses(snapshot) ? snapshot.recurringExpenses : [],
    documents: perms.viewDocuments
      ? snapshot.documents.filter((item) => !item.sensitive && item.category !== "identiteit")
      : [],
    travelPlans: perms.viewCalendar
      ? snapshot.travelPlans.map((plan) => ({
          ...plan,
          bookingRef: perms.viewDocuments ? plan.bookingRef : null,
        }))
      : [],
    tasks: snapshot.tasks.filter((task) => {
      if (!task.childId) return perms.editTasks || perms.completeTasks;
      const access = childAccessForMember(snapshot, snapshot.currentMember.id, task.childId);
      if (task.kind === "care" && !canViewMedical(snapshot)) return false;
      return access.canView;
    }),
    routineOccurrences: snapshot.routineOccurrences.filter((item) => {
      if (!item.childId) return perms.completeTasks;
      const access = childAccessForMember(snapshot, snapshot.currentMember.id, item.childId);
      if (!access.canView) return false;
      const routine = snapshot.tasks.find((task) => task.id === item.routineId);
      if (routine?.kind === "care" && !canViewMedical(snapshot)) return false;
      return true;
    }),
    neededItems: snapshot.neededItems.filter((item) => visibleChildIds.has(item.childId)),
    sizes: snapshot.sizes.filter((item) => visibleChildIds.has(item.childId)),
    schools: snapshot.schools.filter((item) => visibleChildIds.has(item.childId)),
    clubs: snapshot.clubs.filter((item) => visibleChildIds.has(item.childId)),
    childActivities: snapshot.childActivities.filter((item) => visibleChildIds.has(item.childId)),
    childContacts: snapshot.childContacts.filter((item) => visibleChildIds.has(item.childId)),
    childUpdates: snapshot.childUpdates.filter((item) => visibleChildIds.has(item.childId)),
    vacations: perms.viewCustody ? snapshot.vacations : [],
  };

  if (snapshot.currentMember.role === "viewer" && !snapshot.currentMember.contactOnly) {
    return {
      ...filtered,
      children: filtered.children.map((child) => ({
        ...child,
        passportExpiresOn: null,
        passportNumber: null,
      })),
    };
  }

  return filtered;
}
