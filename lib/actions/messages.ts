"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { exportFamilyOverview, type ExportFormat } from "@/lib/architecture/export";
import { guestLinkUrl } from "@/lib/architecture/guest-links";
import { writeAuditLog } from "@/lib/security/audit";
import { requireAuthorizedMutation, assertResourceInFamily } from "@/lib/security/guard";
import type { ContextMessageKind, ContextResourceType } from "@/lib/domain/types";

export async function createContextMessageAction(formData: FormData) {
  const resourceType = String(formData.get("resourceType") ?? "") as ContextResourceType;
  const resourceId = String(formData.get("resourceId") ?? "");
  const kind = (String(formData.get("kind") ?? "update") as ContextMessageKind) || "update";
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Bericht mag niet leeg zijn.");

  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });

  const message = await getRepository().createContextMessage({
    familyId: snapshot.family.id,
    authorMemberId: snapshot.currentMember.id,
    resourceType,
    resourceId,
    kind,
    body,
  });

  await writeAuditLog(snapshot, {
    action: "create",
    resourceType: "context_message",
    resourceId: message.id,
    metadata: { resourceType, resourceId },
  });

  revalidatePath("/vandaag");
  revalidatePath("/agenda");
  revalidatePath("/regelen");
  revalidatePath("/kosten");
}

export async function markContextMessageReadAction(formData: FormData) {
  const messageId = String(formData.get("messageId") ?? "");
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });

  await getRepository().markContextMessageRead({
    messageId,
    readerMemberId: snapshot.currentMember.id,
    actorUserId: snapshot.currentProfile.id,
  });

  revalidatePath("/vandaag");
  revalidatePath("/agenda");
  revalidatePath("/regelen");
  revalidatePath("/kosten");
}

export async function respondToContextMessageAction(formData: FormData) {
  const messageId = String(formData.get("messageId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "confirmed" | "declined";
  const responseBody = String(formData.get("responseBody") ?? "") || null;

  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });

  await getRepository().respondToContextMessage({
    messageId,
    responderMemberId: snapshot.currentMember.id,
    actorUserId: snapshot.currentProfile.id,
    decision,
    responseBody,
  });

  await writeAuditLog(snapshot, {
    action: "update",
    resourceType: "context_message",
    resourceId: messageId,
    metadata: { decision },
  });

  revalidatePath("/vandaag");
  revalidatePath("/agenda");
  revalidatePath("/regelen");
  revalidatePath("/kosten");
}

export async function handoverCheckInAction(formData: FormData) {
  const handoverId = String(formData.get("handoverId") ?? "");
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_custody",
    rateLimit: "mutation",
  });

  const handover = snapshot.handovers.find((item) => item.id === handoverId);
  if (!handover) throw new Error("Overdracht niet gevonden.");
  assertResourceInFamily(snapshot, handover.familyId);

  await getRepository().handoverCheckIn({
    handoverId,
    memberId: snapshot.currentMember.id,
    actorUserId: snapshot.currentProfile.id,
  });

  await writeAuditLog(snapshot, {
    action: "update",
    resourceType: "handover",
    resourceId: handoverId,
    metadata: { checkIn: true },
  });

  revalidatePath("/vandaag");
  revalidatePath("/agenda");
}

export async function createGuestLinkAction(formData: FormData) {
  const changeRequestId = String(formData.get("changeRequestId") ?? "") || null;
  const label = String(formData.get("label") ?? "Ophaalverzoek").trim();

  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_custody",
    rateLimit: "mutation",
  });

  if (changeRequestId) {
    const request = snapshot.changeRequests.find((item) => item.id === changeRequestId);
    if (!request) throw new Error("Verzoek niet gevonden.");
    assertResourceInFamily(snapshot, request.familyId);
  }

  const link = await getRepository().createGuestLink({
    familyId: snapshot.family.id,
    createdByMemberId: snapshot.currentMember.id,
    label,
    changeRequestId,
    scopes: ["child_pickup"],
  });

  await writeAuditLog(snapshot, {
    action: "create",
    resourceType: "guest_link",
    resourceId: link.id,
    metadata: { changeRequestId },
  });

  return guestLinkUrl(link);
}

export async function respondToGuestLinkAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const decision = String(formData.get("decision") ?? "") as "accepted" | "declined";
  const respondedByName = String(formData.get("respondedByName") ?? "").trim() || "Gast";

  await getRepository().respondToGuestLink({ token, decision, respondedByName });
}

export async function createImportJobAction(formData: FormData) {
  const source = String(formData.get("source") ?? "photo") as "photo" | "pdf" | "email";
  const fileName = String(formData.get("fileName") ?? "") || undefined;

  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_calendar",
    rateLimit: "mutation",
  });

  const job = await getRepository().createImportJob({
    familyId: snapshot.family.id,
    source,
    fileName,
  });

  await writeAuditLog(snapshot, {
    action: "create",
    resourceType: "import_job",
    resourceId: job.id,
    metadata: { source, fileName: fileName ?? null },
  });

  return { jobId: job.id, status: job.status };
}

export async function exportFamilyOverviewAction(formData: FormData) {
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const format = (String(formData.get("format") ?? "html") as ExportFormat) || "html";

  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });

  const result = await exportFamilyOverview(snapshot, { from, to }, format);
  return {
    content: result.content,
    mimeType: result.mimeType,
    filename: result.filename,
  };
}
