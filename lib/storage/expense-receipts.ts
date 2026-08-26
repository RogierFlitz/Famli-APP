import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  randomStorageFilename,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/security/storage";
import {
  deleteMemoryBlob,
  getMemoryBlob,
  putMemoryBlob,
} from "@/lib/storage/memory-blobs";

export const EXPENSE_RECEIPTS_BUCKET = "family-documents";

export function expenseReceiptStoragePath(familyId: string, storageFilename: string): string {
  return `${familyId}/receipts/${storageFilename}`;
}

export async function storeExpenseReceiptBlob(input: {
  familyId: string;
  storagePath: string;
  data: Buffer;
  mimeType: string;
}): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(EXPENSE_RECEIPTS_BUCKET).upload(input.storagePath, input.data, {
      contentType: input.mimeType,
      upsert: true,
    });
    if (error) throw error;
    return;
  }

  putMemoryBlob(input.storagePath, input.data, input.mimeType);
}

export async function deleteExpenseReceiptBlob(storagePath: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.storage.from(EXPENSE_RECEIPTS_BUCKET).remove([storagePath]);
    return;
  }

  deleteMemoryBlob(storagePath);
}

export async function expenseReceiptViewUrl(storagePath: string, expenseId: string): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.storage
      .from(EXPENSE_RECEIPTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  if (!getMemoryBlob(storagePath)) return null;
  return `/api/expense-receipt/${expenseId}`;
}

export function newExpenseReceiptFilename(originalFilename: string): string {
  return randomStorageFilename(originalFilename);
}
