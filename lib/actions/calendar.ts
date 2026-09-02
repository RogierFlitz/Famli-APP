"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { writeAuditLog } from "@/lib/security/audit";
import { requireAuthorizedMutation } from "@/lib/security/guard";
import type { ChangeRequestType, EventCategory } from "@/lib/domain/types";
import { handoverPackingOrTemplate, packingListOrTemplate } from "@/lib/packing/templates";

export async function createChangeRequestAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_custody",
    rateLimit: "mutation",
  });
  const request = await getRepository().createChangeRequest({
    familyId: snapshot.family.id,
    requestedByMemberId: snapshot.currentMember.id,
    type: String(formData.get("type") ?? "other") as ChangeRequestType,
    targetDate: String(formData.get("targetDate") ?? ""),
    message: String(formData.get("message") ?? ""),
    payload: {
      requestedCustodianMemberId: String(
        formData.get("requestedCustodianMemberId") ?? snapshot.currentMember.id,
      ),
      time: String(formData.get("time") ?? ""),
      location: String(formData.get("location") ?? ""),
      pickupMemberId: String(formData.get("pickupMemberId") ?? ""),
      dropoffMemberId: String(formData.get("dropoffMemberId") ?? ""),
      stayMemberId: String(formData.get("stayMemberId") ?? ""),
      taskId: String(formData.get("taskId") ?? ""),
      childId: String(formData.get("childId") ?? ""),
    },
  });
  await writeAuditLog(snapshot, {
    action: "create",
    resourceType: "change_request",
    resourceId: request.id,
  });
  revalidatePath("/agenda");
  revalidatePath("/regelen");
  revalidatePath("/vandaag");
  revalidatePath("/kinderen");
}

export async function respondToChangeRequestAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_custody",
    rateLimit: "mutation",
  });
  const id = String(formData.get("id") ?? "");
  await getRepository().respondToChangeRequest({
    id,
    actorMemberId: snapshot.currentMember.id,
    actorUserId: snapshot.currentProfile.id,
    decision: String(formData.get("decision") ?? "declined") as
      | "accepted"
      | "declined"
      | "alternative_proposed",
    message: String(formData.get("message") ?? ""),
    alternativePayload: formData.get("alternativeDate")
      ? { targetDate: String(formData.get("alternativeDate")) }
      : undefined,
  });
  await writeAuditLog(snapshot, {
    action: "update",
    resourceType: "change_request",
    resourceId: id,
  });
  revalidatePath("/agenda");
  revalidatePath("/regelen");
  revalidatePath("/vandaag");
  revalidatePath("/kinderen");
}

export async function createEventAction(formData: FormData) {
  const childIds = formData.getAll("childIds").map(String);
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_calendar",
    childId: childIds[0] ?? null,
    rateLimit: "mutation",
  });
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "09:00");
  const end = String(formData.get("end") ?? "10:00");
  const event = await getRepository().createEvent({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    title: String(formData.get("title") ?? ""),
    category: String(formData.get("category") ?? "activiteit") as EventCategory,
    startsAt: `${date}T${start}:00`,
    endsAt: `${date}T${end}:00`,
    location: String(formData.get("location") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
    packingList: packingListOrTemplate(
      String(formData.get("title") ?? ""),
      String(formData.get("category") ?? "activiteit") as EventCategory,
      String(formData.get("packingList") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
    childIds,
    memberIds: formData.getAll("memberIds").map(String),
    allDay: String(formData.get("allDay") ?? "") === "true",
  });
  await writeAuditLog(snapshot, {
    action: "create",
    resourceType: "event",
    resourceId: event.id,
  });
  revalidatePath("/agenda");
  revalidatePath("/vandaag");
  revalidatePath("/kinderen");
}

export async function createHandoverAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_custody",
    rateLimit: "mutation",
  });
  const childIds = formData.getAll("childIds").map(String);
  await getRepository().createHandover({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    date: String(formData.get("date") ?? ""),
    time: String(formData.get("time") ?? "17:00"),
    fromMemberId: String(formData.get("fromMemberId") ?? snapshot.currentMember.id),
    toMemberId: String(formData.get("toMemberId") ?? snapshot.currentMember.id),
    location: String(formData.get("location") ?? "") || null,
    packingList: handoverPackingOrTemplate(
      String(formData.get("packingList") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
    notes: String(formData.get("notes") ?? "") || null,
    childIds: childIds.length ? childIds : snapshot.children.map((child) => child.id),
  });
  revalidatePath("/agenda");
  revalidatePath("/vandaag");
  revalidatePath("/kinderen");
}

export async function createVacationAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_travel",
    rateLimit: "mutation",
  });
  await getRepository().createVacation({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    title: String(formData.get("title") ?? "Vakantie"),
    kind: "own",
    withMemberId: snapshot.currentMember.id,
    startsOn: String(formData.get("startsOn") ?? ""),
    endsOn: String(formData.get("endsOn") ?? ""),
    notes: String(formData.get("notes") ?? "") || null,
  });
  revalidatePath("/vakanties");
}

export async function respondToVacationAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_travel",
    rateLimit: "mutation",
  });
  await getRepository().respondToVacation(
    String(formData.get("id") ?? ""),
    snapshot.currentProfile.id,
    String(formData.get("accept") ?? "") === "true",
  );
  revalidatePath("/vakanties");
}
