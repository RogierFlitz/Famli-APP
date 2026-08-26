import { NextResponse } from "next/server";
import { requireSnapshot } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { hasCapability } from "@/lib/security/capabilities";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getMemoryBlob } from "@/lib/storage/memory-blobs";

export async function GET(_request: Request, context: { params: Promise<{ expenseId: string }> }) {
  const snapshot = await requireSnapshot();
  if (!hasCapability(snapshot, "view_expenses")) {
    return new Response("Geen toegang", { status: 403 });
  }

  const { expenseId } = await context.params;
  const expense = snapshot.expenses.find((item) => item.id === expenseId);
  if (!expense?.receiptStoragePath) {
    return new Response("Bon niet gevonden", { status: 404 });
  }

  if (expense.familyId !== snapshot.family.id) {
    return new Response("Geen toegang", { status: 403 });
  }

  if (isSupabaseConfigured()) {
    const url = await getRepository().getExpenseReceiptViewUrl({
      expenseId,
      actorUserId: snapshot.currentProfile.id,
    });
    if (!url) return new Response("Bon niet gevonden", { status: 404 });
    return NextResponse.redirect(url);
  }

  const blob = getMemoryBlob(expense.receiptStoragePath);
  if (!blob) {
    return new Response("Bon niet gevonden", { status: 404 });
  }

  const filename = expense.receiptFilename ?? "bon";
  return new Response(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": blob.mimeType,
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
