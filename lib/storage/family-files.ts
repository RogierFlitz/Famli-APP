import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { randomStorageFilename, SIGNED_URL_TTL_SECONDS } from "@/lib/security/storage";
import { deleteMemoryBlob, getMemoryBlob, putMemoryBlob } from "@/lib/storage/memory-blobs";

export const FAMILY_FILES_BUCKET = "family-documents";

export function familyFileStoragePath(familyId: string, storageFilename: string): string {
  return `${familyId}/files/${storageFilename}`;
}

export async function storeFamilyFile(input: {
  familyId: string;
  storagePath: string;
  data: Buffer;
  mimeType: string;
}): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(FAMILY_FILES_BUCKET).upload(input.storagePath, input.data, {
      contentType: input.mimeType,
      upsert: true,
    });
    if (error) throw error;
    return;
  }
  putMemoryBlob(input.storagePath, input.data, input.mimeType);
}

export async function familyFileViewUrl(storagePath: string, documentId: string): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.storage
      .from(FAMILY_FILES_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }
  if (!getMemoryBlob(storagePath)) return null;
  return `/api/family-document/${documentId}`;
}

export function newFamilyFilename(originalFilename: string): string {
  return randomStorageFilename(originalFilename);
}

export { deleteMemoryBlob };
