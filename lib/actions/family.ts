"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { requireSnapshot } from "@/lib/auth/session";
import { parseEuroToCents } from "@/lib/money";
import type { ExpenseCategory, RecurrenceInterval, TaskStatus } from "@/lib/domain/types";

export async function createExpenseAction(formData: FormData) {
  const snapshot = await requireSnapshot();
  const amountCents = parseEuroToCents(String(formData.get("amount") ?? "0"));
  const split = String(formData.get("split") ?? "50");
  const parents = snapshot.members.filter((member) => member.role !== "viewer");
  const me = snapshot.currentMember.id;
  const other = parents.find((member) => member.id !== me)?.id;
  const myPercent = split === "custom" ? Number(formData.get("customPercent") ?? "50") : Number(split);
  const splitPercents: Record<string, number> = { [me]: myPercent };
  if (other) splitPercents[other] = 100 - myPercent;
  const receipt = formData.get("receipt");
  const receiptUrl = receipt instanceof File && receipt.size > 0 ? receipt.name : null;

  await getRepository().createExpense({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    description: String(formData.get("description") ?? ""),
    amountCents,
    date: String(formData.get("date") ?? ""),
    childId: String(formData.get("childId") ?? "") || null,
    category: String(formData.get("category") ?? "overig") as ExpenseCategory,
    paidByMemberId: String(formData.get("paidByMemberId") ?? me),
    splitPercents,
    notes: String(formData.get("notes") ?? "") || null,
    receiptUrl,
  });
  revalidatePath("/kosten");
  revalidatePath("/vandaag");
  revalidatePath("/regelen");
  revalidatePath("/kinderen");
}

export async function markSplitPaidAction(formData: FormData) {
  const snapshot = await requireSnapshot();
  await getRepository().markSplitPaid(String(formData.get("splitId") ?? ""), snapshot.currentProfile.id);
  revalidatePath("/kosten");
  revalidatePath("/regelen");
  revalidatePath("/vandaag");
}

export async function createRecurringExpenseAction(formData: FormData) {
  const snapshot = await requireSnapshot();
  const parents = snapshot.members.filter((member) => member.role !== "viewer");
  const splitPercents: Record<string, number> = {};
  const share = parents.length ? Math.round(100 / parents.length) : 100;
  parents.forEach((member, index) => {
    splitPercents[member.id] = index === parents.length - 1 ? 100 - share * (parents.length - 1) : share;
  });
  await getRepository().addRecurringExpense({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    description: String(formData.get("description") ?? ""),
    amountCents: parseEuroToCents(String(formData.get("amount") ?? "0")),
    category: String(formData.get("category") ?? "overig") as ExpenseCategory,
    interval: String(formData.get("interval") ?? "monthly") as RecurrenceInterval,
    nextDueDate: String(formData.get("nextDueDate") ?? ""),
    paidByMemberId: String(formData.get("paidByMemberId") ?? snapshot.currentMember.id),
    splitPercents,
    childId: String(formData.get("childId") ?? "") || null,
  });
  revalidatePath("/kosten");
}

export async function createTaskAction(formData: FormData) {
  const snapshot = await requireSnapshot();
  await getRepository().createTask({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    childId: String(formData.get("childId") ?? "") || null,
    assigneeMemberId: String(formData.get("assigneeMemberId") ?? "") || null,
    dueAt: String(formData.get("dueAt") ?? "") || null,
  });
  revalidatePath("/regelen");
  revalidatePath("/vandaag");
}

export async function updateTaskStatusAction(formData: FormData) {
  const snapshot = await requireSnapshot();
  await getRepository().updateTaskStatus(
    String(formData.get("taskId") ?? ""),
    String(formData.get("status") ?? "open") as TaskStatus,
    snapshot.currentProfile.id,
  );
  revalidatePath("/regelen");
  revalidatePath("/vandaag");
}

export async function updateCalendarPrivacyAction(formData: FormData) {
  const snapshot = await requireSnapshot();
  await getRepository().updateCalendarPrivacy(
    snapshot.currentProfile.id,
    String(formData.get("privacyMode") ?? "busy") as "full" | "busy" | "hidden",
  );
  revalidatePath("/instellingen");
}

export async function markNotificationsReadAction() {
  const snapshot = await requireSnapshot();
  await getRepository().markNotificationsRead(snapshot.currentProfile.id);
  revalidatePath("/vandaag");
  revalidatePath("/regelen");
}
