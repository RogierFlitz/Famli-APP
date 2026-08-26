import { requireSnapshot } from "@/lib/auth/session";
import { hasCapability } from "@/lib/security/capabilities";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getMemoryBlob } from "@/lib/storage/memory-blobs";

export async function GET(_request: Request, context: { params: Promise<{ expenseId: string }> }) {
  if (isSupabaseConfigured()) {
    return new Response("Niet beschikbaar", { status: 404 });
  }

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
