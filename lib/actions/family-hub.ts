"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { writeAuditLog } from "@/lib/security/audit";
import { requireAuthorizedMutation } from "@/lib/security/guard";
import { validateUpload } from "@/lib/security/storage";
import { mergeNotificationPrefs } from "@/lib/notifications/prefs";
import type {
  ChildActivityKind,
  ChildContactCategory,
  DocumentCategory,
  ExpenseCategory,
} from "@/lib/domain/types";

function refreshFamily() {
  revalidatePath("/vandaag");
  revalidatePath("/agenda");
  revalidatePath("/regelen");
  revalidatePath("/kosten");
  revalidatePath("/kinderen");
  revalidatePath("/documenten");
  revalidatePath("/instellingen");
}

export async function updateExpenseAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "") || null;
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_expenses",
    childId,
    rateLimit: "mutation",
  });
  const id = String(formData.get("id") ?? "");
  await getRepository().updateExpense({
    id,
    actorUserId: snapshot.currentProfile.id,
    description: String(formData.get("description") ?? ""),
    date: String(formData.get("date") ?? ""),
    childId,
    category: String(formData.get("category") ?? "overig") as ExpenseCategory,
    notes: String(formData.get("notes") ?? "") || null,
  });
  await writeAuditLog(snapshot, { action: "update", resourceType: "expense", resourceId: id });
  refreshFamily();
}

export async function voidExpenseAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_expenses",
    rateLimit: "mutation",
  });
  const id = String(formData.get("id") ?? "");
  await getRepository().voidExpense(id, snapshot.currentProfile.id);
  await writeAuditLog(snapshot, { action: "delete", resourceType: "expense", resourceId: id });
  refreshFamily();
}

export async function settleOpenExpensesAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_expenses",
    rateLimit: "mutation",
  });
  await getRepository().settleOpenExpenses({
    familyId: snapshot.family.id,
    actorUserId: snapshot.currentProfile.id,
    actorMemberId: snapshot.currentMember.id,
    note: String(formData.get("note") ?? "") || null,
  });
  await writeAuditLog(snapshot, {
    action: "update",
    resourceType: "expense",
    resourceId: snapshot.family.id,
    metadata: { settled: true },
  });
  refreshFamily();
}

export async function addChildActivityAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_calendar",
    childId,
    rateLimit: "mutation",
  });
  await getRepository().addChildActivity({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    childId,
    title: String(formData.get("title") ?? ""),
    kind: String(formData.get("kind") ?? "overig") as ChildActivityKind,
    location: String(formData.get("location") ?? "") || null,
    weekday: Number(formData.get("weekday") ?? "1"),
    startTime: String(formData.get("startTime") ?? "17:00"),
    endTime: String(formData.get("endTime") ?? "") || null,
    bringMemberId: String(formData.get("bringMemberId") ?? "") || null,
    pickupMemberId: String(formData.get("pickupMemberId") ?? "") || null,
    stayMemberId: String(formData.get("stayMemberId") ?? "") || null,
    contactName: String(formData.get("contactName") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  });
  refreshFamily();
}

export async function addChildContactAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_calendar",
    childId,
    rateLimit: "mutation",
  });
  await getRepository().addChildContact({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    childId,
    category: String(formData.get("category") ?? "overig") as ChildContactCategory,
    name: String(formData.get("name") ?? ""),
    organization: String(formData.get("organization") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  });
  refreshFamily();
}

export async function saveChildSchoolAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_calendar",
    childId,
    rateLimit: "mutation",
  });
  await getRepository().saveChildSchool({
    familyId: snapshot.family.id,
    childId,
    name: String(formData.get("name") ?? ""),
    className: String(formData.get("className") ?? ""),
    teacher: String(formData.get("teacher") ?? "") || null,
    contact: String(formData.get("contact") ?? "") || null,
    hours: String(formData.get("hours") ?? "") || null,
    gymDays: String(formData.get("gymDays") ?? "") || null,
  });
  refreshFamily();
}

export async function uploadFamilyDocumentAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "") || null;
  const { snapshot } = await requireAuthorizedMutation({
    capability: "upload_documents",
    childId,
    rateLimit: "mutation",
  });
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Kies een bestand.");
  }
  validateUpload({
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });
  const doc = await getRepository().addFamilyDocument({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    childId,
    title: String(formData.get("title") ?? file.name),
    category: String(formData.get("category") ?? "overig") as DocumentCategory,
    data: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type || "application/octet-stream",
    originalFilename: file.name,
  });
  await writeAuditLog(snapshot, {
    action: "upload",
    resourceType: "document",
    resourceId: doc.id,
  });
  refreshFamily();
}

export async function updateNotificationPrefsAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });
  const current = mergeNotificationPrefs(snapshot.currentProfile.notificationPrefs);
  const next = { ...current };
  for (const key of Object.keys(current) as Array<keyof typeof current>) {
    next[key] = {
      inApp: formData.get(`${key}_inApp`) === "on",
      email: formData.get(`${key}_email`) === "on",
      push: formData.get(`${key}_push`) === "on",
    };
  }
  await getRepository().updateNotificationPrefs(snapshot.currentProfile.id, next);
  revalidatePath("/instellingen");
}
