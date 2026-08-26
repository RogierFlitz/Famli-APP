"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { requireSnapshot } from "@/lib/auth/session";
import { MEDICAL_DISCLAIMER } from "@/lib/members/permissions";
import type { RoutineAssignMode } from "@/lib/domain/types";

export async function createRoutineAction(formData: FormData) {
  const snapshot = await requireSnapshot();
  const kind = String(formData.get("kind") ?? "routine") as "routine" | "care";
  const weekdays = formData
    .getAll("weekdays")
    .map((value) => Number(value))
    .filter((value) => value >= 1 && value <= 7);
  const times = String(formData.get("times") ?? "08:00")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  await getRepository().createRoutine({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    childId: String(formData.get("childId") ?? "") || null,
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

  revalidatePath("/regelen");
  revalidatePath("/vandaag");
  revalidatePath("/kinderen");
}

export async function completeRoutineOccurrenceAction(formData: FormData) {
  const snapshot = await requireSnapshot();
  await getRepository().completeRoutineOccurrence({
    occurrenceId: String(formData.get("occurrenceId") ?? ""),
    actorUserId: snapshot.currentProfile.id,
    actorMemberId: snapshot.currentMember.id,
    notes: String(formData.get("notes") ?? "") || null,
  });
  revalidatePath("/regelen");
  revalidatePath("/vandaag");
  revalidatePath("/kinderen");
}
