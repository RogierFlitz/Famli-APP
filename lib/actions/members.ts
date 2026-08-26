"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { writeAuditLog } from "@/lib/security/audit";
import { requireAuthorizedMutation } from "@/lib/security/guard";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { inviteExpiresAt } from "@/lib/security/invites";
import { capabilitiesForDb } from "@/lib/security/capabilities";
import { presetPermissions, roleForRelation } from "@/lib/members/permissions";
import type { MemberRelationType, PermissionPreset } from "@/lib/domain/types";

export async function inviteMemberAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "manage_family_members",
    rateLimit: "invite",
  });

  const relationType = String(formData.get("relationType") ?? "partner") as MemberRelationType;
  const contactOnly = String(formData.get("contactOnly") ?? "") === "true";
  const email = String(formData.get("email") ?? "").trim() || null;
  const childIds = formData.getAll("childIds").map(String);
  const permissionPreset = String(formData.get("permissionPreset") ?? "involved") as PermissionPreset;

  assertRateLimit("invite", snapshot.family.id);

  const perms = presetPermissions(permissionPreset, relationType);

  await getRepository().inviteMember({
    familyId: snapshot.family.id,
    email,
    parentLabel: String(formData.get("parentLabel") ?? ""),
    relationType,
    permissionPreset,
    householdId: String(formData.get("householdId") ?? "") || null,
    linkedParentMemberId: String(formData.get("linkedParentMemberId") ?? "") || null,
    contactOnly,
    phone: String(formData.get("phone") ?? "") || null,
    childIds: childIds.length ? childIds : snapshot.children.map((child) => child.id),
  });

  await writeAuditLog(snapshot, {
    action: "invite",
    resourceType: "family_member",
    resourceId: snapshot.family.id,
    metadata: {
      email,
      relationType,
      tokenIssued: true,
      expiresAt: inviteExpiresAt().toISOString(),
      capabilities: capabilitiesForDb({
        ...snapshot.currentMember,
        relationType,
        permissionPreset,
        permissions: perms,
        contactOnly,
      }),
      role: roleForRelation(relationType),
    },
  });

  revalidatePath("/instellingen");
}
