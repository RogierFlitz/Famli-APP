import type { FamilyMember, FamilySnapshot, MemberPermissions } from "@/lib/domain/types";
import {
  childAccessForMember,
  isParentMember,
  memberPermissions,
} from "@/lib/members/permissions";

/** Canonical capability keys enforced in backend / database. */
export type Capability =
  | "view_child_basic"
  | "view_child_sensitive"
  | "view_calendar"
  | "edit_calendar"
  | "view_custody"
  | "edit_custody"
  | "view_tasks"
  | "edit_tasks"
  | "view_expenses"
  | "edit_expenses"
  | "view_travel"
  | "edit_travel"
  | "view_documents"
  | "upload_documents"
  | "view_care_routines"
  | "edit_care_routines"
  | "manage_family_members";

export const ALL_CAPABILITIES: Capability[] = [
  "view_child_basic",
  "view_child_sensitive",
  "view_calendar",
  "edit_calendar",
  "view_custody",
  "edit_custody",
  "view_tasks",
  "edit_tasks",
  "view_expenses",
  "edit_expenses",
  "view_travel",
  "edit_travel",
  "view_documents",
  "upload_documents",
  "view_care_routines",
  "edit_care_routines",
  "manage_family_members",
];

/** Maps legacy MemberPermissions to canonical capabilities. */
export function permissionsToCapabilities(perms: MemberPermissions): Set<Capability> {
  const caps = new Set<Capability>();
  if (perms.viewCalendar) {
    caps.add("view_calendar");
    caps.add("view_child_basic");
  }
  if (perms.viewCustody) caps.add("view_custody");
  if (perms.editCustody) caps.add("edit_custody");
  if (perms.acceptChangeRequests) caps.add("edit_custody");
  if (perms.viewExpenses) caps.add("view_expenses");
  if (perms.editExpenses) caps.add("edit_expenses");
  if (perms.viewMedical) {
    caps.add("view_child_sensitive");
    caps.add("view_care_routines");
  }
  if (perms.viewDocuments) caps.add("view_documents");
  if (perms.editTasks) {
    caps.add("edit_tasks");
    caps.add("edit_calendar");
  }
  if (perms.completeTasks) caps.add("edit_tasks");
  if (perms.manageMembers) caps.add("manage_family_members");
  return caps;
}

export function memberCapabilities(member: FamilyMember): Set<Capability> {
  if (member.contactOnly) return new Set();
  if (isParentMember(member)) return new Set(ALL_CAPABILITIES);
  return permissionsToCapabilities(memberPermissions(member));
}

export function hasCapability(snapshot: FamilySnapshot, capability: Capability): boolean {
  return memberCapabilities(snapshot.currentMember).has(capability);
}

export function hasChildCapability(
  snapshot: FamilySnapshot,
  childId: string,
  capability: Capability,
): boolean {
  const member = snapshot.currentMember;
  if (member.contactOnly) return false;

  const childInFamily = snapshot.children.some(
    (child) => child.id === childId && child.familyId === snapshot.family.id,
  );
  if (!childInFamily) return false;

  if (isParentMember(member)) return true;

  const access = childAccessForMember(snapshot, member.id, childId);
  if (!access.canView && capability.startsWith("view_")) return false;
  if (!access.canEdit && capability.startsWith("edit_")) return false;

  return hasCapability(snapshot, capability);
}

/** Partners never receive these unless explicitly granted via custom permissions. */
export const PARTNER_DENIED_BY_DEFAULT: Capability[] = [
  "edit_custody",
  "manage_family_members",
  "edit_expenses",
  "view_documents",
  "upload_documents",
  "view_child_sensitive",
];

export function capabilitiesForDb(member: FamilyMember): Record<string, boolean> {
  const caps = memberCapabilities(member);
  return Object.fromEntries(ALL_CAPABILITIES.map((cap) => [cap, caps.has(cap)]));
}
