import { NextResponse } from "next/server";
import { requireSnapshot } from "@/lib/auth/session";
import { hasCapability } from "@/lib/security/capabilities";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getMemoryBlob } from "@/lib/storage/memory-blobs";
import { getRepository } from "@/lib/data";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  const snapshot = await requireSnapshot();
  if (!hasCapability(snapshot, "view_documents")) {
    return new Response("Geen toegang", { status: 403 });
  }
  const { documentId } = await context.params;
  const doc = snapshot.documents.find((item) => item.id === documentId);
  if (!doc?.storagePath || doc.familyId !== snapshot.family.id) {
    return new Response("Document niet gevonden", { status: 404 });
  }
  if (isSupabaseConfigured()) {
    const url = await getRepository().familyDocumentViewUrl(documentId, snapshot.currentProfile.id);
    if (!url) return new Response("Document niet gevonden", { status: 404 });
    return NextResponse.redirect(url);
  }
  const blob = getMemoryBlob(doc.storagePath);
  if (!blob) return new Response("Document niet gevonden", { status: 404 });
  return new Response(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": blob.mimeType,
      "Content-Disposition": `inline; filename="${(doc.title || "document").replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
