"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { writeAuditLog } from "@/lib/security/audit";
import { assertResourceInFamily, requireAuthorizedMutation } from "@/lib/security/guard";
import { validateUpload } from "@/lib/security/storage";

function receiptFromForm(formData: FormData): File | null {
  const receipt = formData.get("receipt");
  if (!(receipt instanceof File) || receipt.size <= 0) return null;
  return receipt;
}

export async function uploadExpenseReceiptAction(expenseId: string, formData: FormData) {
  const receipt = receiptFromForm(formData);
  if (!receipt) throw new Error("Kies een bon om te uploaden.");

  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_expenses",
    rateLimit: "upload",
  });

  const expense = snapshot.expenses.find((item) => item.id === expenseId);
  if (!expense) throw new Error("Kostenpost niet gevonden.");
  assertResourceInFamily(snapshot, expense.familyId);

  validateUpload({
    filename: receipt.name,
    mimeType: receipt.type || "application/octet-stream",
    sizeBytes: receipt.size,
  });

  const buffer = Buffer.from(await receipt.arrayBuffer());
  await getRepository().uploadExpenseReceipt({
    expenseId,
    actorUserId: snapshot.currentProfile.id,
    data: buffer,
    mimeType: receipt.type,
    originalFilename: receipt.name,
  });

  await writeAuditLog(snapshot, {
    action: "upload",
    resourceType: "expense_receipt",
    resourceId: expenseId,
    metadata: { filename: receipt.name },
  });

  revalidatePath("/kosten");
  revalidatePath("/vandaag");
  revalidatePath("/regelen");
}

export async function removeExpenseReceiptAction(expenseId: string) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_expenses",
    rateLimit: "mutation",
  });

  const expense = snapshot.expenses.find((item) => item.id === expenseId);
  if (!expense) throw new Error("Kostenpost niet gevonden.");
  assertResourceInFamily(snapshot, expense.familyId);

  await getRepository().removeExpenseReceipt({
    expenseId,
    actorUserId: snapshot.currentProfile.id,
  });

  await writeAuditLog(snapshot, {
    action: "delete",
    resourceType: "expense_receipt",
    resourceId: expenseId,
  });

  revalidatePath("/kosten");
}

export async function getExpenseReceiptViewUrlAction(expenseId: string): Promise<string | null> {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_expenses",
    rateLimit: "mutation",
  });

  const expense = snapshot.expenses.find((item) => item.id === expenseId);
  if (!expense?.receiptStoragePath) return null;
  assertResourceInFamily(snapshot, expense.familyId);

  return getRepository().getExpenseReceiptViewUrl({
    expenseId,
    actorUserId: snapshot.currentProfile.id,
  });
}
