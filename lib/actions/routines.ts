"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { writeAuditLog } from "@/lib/security/audit";
import { requireAuthorizedMutation } from "@/lib/security/guard";
import { MEDICAL_DISCLAIMER } from "@/lib/members/permissions";
import { parseEuroToCents } from "@/lib/money";
import type { RoutineAssignMode } from "@/lib/domain/types";

export async function createRoutineAction(formData: FormData) {
  const kind = String(formData.get("kind") ?? "routine") as "routine" | "care";
  const childId = String(formData.get("childId") ?? "") || null;
  const { snapshot } = await requireAuthorizedMutation({
    capability: kind === "care" ? "edit_care_routines" : "edit_tasks",
    childId,
    rateLimit: "mutation",
  });
  const weekdays = formData
    .getAll("weekdays")
    .map((value) => Number(value))
    .filter((value) => value >= 1 && value <= 7);
  const times = String(formData.get("times") ?? "08:00")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const routine = await getRepository().createRoutine({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    childId,
    assigneeMemberId: String(formData.get("assigneeMemberId") ?? "") || null,
    kind,
    weekdays: weekdays.length ? weekdays : [1, 2, 3, 4, 5],
    times: times.length ? times : ["08:00"],
    assignMode: (String(formData.get("assignMode") ?? "stay") as RoutineAssignMode) || "stay",
    careLabel: kind === "care" ? String(formData.get("careLabel") ?? formData.get("title") ?? "") : null,
    careInstructions: kind === "care" ? MEDICAL_DISCLAIMER : null,
    packingItems: String(formData.get("packingItems") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  });

  await writeAuditLog(snapshot, {
    action: "create",
    resourceType: kind === "care" ? "care_routine" : "routine",
    resourceId: routine.id,
  });

  revalidatePath("/regelen");
  revalidatePath("/vandaag");
  revalidatePath("/kinderen");
}

export async function completeRoutineOccurrenceAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  const occurrenceId = String(formData.get("occurrenceId") ?? "");
  await getRepository().completeRoutineOccurrence({
    occurrenceId,
    actorUserId: snapshot.currentProfile.id,
    actorMemberId: snapshot.currentMember.id,
    notes: String(formData.get("notes") ?? "") || null,
  });
  await writeAuditLog(snapshot, {
    action: "update",
    resourceType: "routine_occurrence",
    resourceId: occurrenceId,
  });
  revalidatePath("/regelen");
  revalidatePath("/vandaag");
  revalidatePath("/kinderen");
}
