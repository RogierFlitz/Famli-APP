import type {
  ChildMemberAccess,
  FamilyMember,
  FamilySnapshot,
  MemberPermissions,
  MemberRelationType,
  PermissionPreset,
} from "@/lib/domain/types";

export const MEDICAL_DISCLAIMER =
  "Neem de instructies van arts, apotheek of verpakking exact over.";

export function parentPermissions(): MemberPermissions {
  return {
    viewCalendar: true,
    viewCustody: true,
    editCustody: true,
    acceptChangeRequests: true,
    viewExpenses: true,
    editExpenses: true,
    viewMedical: true,
    viewDocuments: true,
    editTasks: true,
    completeTasks: true,
    manageMembers: true,
  };
}

export function presetPermissions(
  preset: PermissionPreset,
  relationType: MemberRelationType,
): MemberPermissions {
  if (relationType === "ouder") return parentPermissions();

  if (preset === "practical") {
    return {
      viewCalendar: true,
      viewCustody: false,
      editCustody: false,
      acceptChangeRequests: false,
      viewExpenses: false,
      editExpenses: false,
      viewMedical: relationType === "partner" || relationType === "verzorger",
      viewDocuments: false,
      editTasks: false,
      completeTasks: true,
      manageMembers: false,
    };
  }

  if (preset === "involved") {
    return {
      viewCalendar: true,
      viewCustody: true,
      editCustody: false,
      acceptChangeRequests: false,
      viewExpenses: true,
      editExpenses: false,
      viewMedical: true,
      viewDocuments: true,
      editTasks: true,
      completeTasks: true,
      manageMembers: false,
    };
  }

  return presetPermissions("involved", relationType);
}

export function contactOnlyPermissions(): MemberPermissions {
  return {
    viewCalendar: false,
    viewCustody: false,
    editCustody: false,
    acceptChangeRequests: false,
    viewExpenses: false,
    editExpenses: false,
    viewMedical: false,
    viewDocuments: false,
    editTasks: false,
    completeTasks: false,
    manageMembers: false,
  };
}

export function isParentMember(member: FamilyMember): boolean {
  return member.relationType === "ouder" || member.role === "owner" || member.role === "parent";
}

export function memberPermissions(member: FamilyMember): MemberPermissions {
  if (member.contactOnly) return contactOnlyPermissions();
  if (isParentMember(member)) return parentPermissions();
  return member.permissions;
}

export function canAcceptChangeRequests(snapshot: FamilySnapshot): boolean {
  return memberPermissions(snapshot.currentMember).acceptChangeRequests;
}

export function canEditCustody(snapshot: FamilySnapshot): boolean {
  return memberPermissions(snapshot.currentMember).editCustody;
}

export function canManageMembers(snapshot: FamilySnapshot): boolean {
  return memberPermissions(snapshot.currentMember).manageMembers;
}

export function canViewExpenses(snapshot: FamilySnapshot): boolean {
  return memberPermissions(snapshot.currentMember).viewExpenses;
}

export function canViewMedical(snapshot: FamilySnapshot): boolean {
  return memberPermissions(snapshot.currentMember).viewMedical;
}

export function childAccessForMember(
  snapshot: FamilySnapshot,
  memberId: string,
  childId: string,
): { canView: boolean; canEdit: boolean } {
  const member = snapshot.members.find((item) => item.id === memberId);
  if (!member || member.contactOnly) return { canView: false, canEdit: false };
  if (isParentMember(member)) return { canView: true, canEdit: true };

  const override = snapshot.childMemberAccess.find(
    (item) => item.memberId === memberId && item.childId === childId,
  );
  if (override) return { canView: override.canView, canEdit: override.canEdit };

  const perms = memberPermissions(member);
  return { canView: perms.viewCalendar, canEdit: perms.editTasks };
}

export function visibleChildren(snapshot: FamilySnapshot) {
  return snapshot.children.filter((child) =>
    childAccessForMember(snapshot, snapshot.currentMember.id, child.id).canView,
  );
}

export function defaultChildAccess(
  memberId: string,
  childIds: string[],
  canView = true,
  canEdit = false,
): ChildMemberAccess[] {
  return childIds.map((childId) => ({
    id: `${memberId}-${childId}`,
    memberId,
    childId,
    canView,
    canEdit,
  }));
}

export function roleForRelation(relationType: MemberRelationType): FamilyMember["role"] {
  if (relationType === "ouder") return "parent";
  if (relationType === "opa_oma" || relationType === "oppas") return "viewer";
  return "guardian";
}
