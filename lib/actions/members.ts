"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { requireSnapshot } from "@/lib/auth/session";
import { canManageMembers } from "@/lib/members/permissions";
import type { MemberRelationType, PermissionPreset } from "@/lib/domain/types";

export async function inviteMemberAction(formData: FormData) {
  const snapshot = await requireSnapshot();
  if (!canManageMembers(snapshot)) {
    throw new Error("Je hebt geen rechten om gezinsleden uit te nodigen.");
  }

  const relationType = String(formData.get("relationType") ?? "partner") as MemberRelationType;
  const contactOnly = String(formData.get("contactOnly") ?? "") === "true";
  const email = String(formData.get("email") ?? "").trim() || null;
  const childIds = formData.getAll("childIds").map(String);

  await getRepository().inviteMember({
    familyId: snapshot.family.id,
    email,
    parentLabel: String(formData.get("parentLabel") ?? ""),
    relationType,
    permissionPreset: String(formData.get("permissionPreset") ?? "involved") as PermissionPreset,
    householdId: String(formData.get("householdId") ?? "") || null,
    linkedParentMemberId: String(formData.get("linkedParentMemberId") ?? "") || null,
    contactOnly,
    phone: String(formData.get("phone") ?? "") || null,
    childIds: childIds.length ? childIds : snapshot.children.map((child) => child.id),
  });

  revalidatePath("/instellingen");
}
