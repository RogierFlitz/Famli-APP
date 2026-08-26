/**
 * Import architecture stub — extensible for photo/PDF/email (no AI parser).
 */
import type { ImportJob, ImportSourceKind } from "@/lib/domain/types";

export type ImportPayload = {
  source: ImportSourceKind;
  fileName?: string;
  mimeType?: string;
};

export function createImportJobPlaceholder(familyId: string, payload: ImportPayload): ImportJob {
  return {
    id: `import-${Date.now()}`,
    familyId,
    source: payload.source,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

export async function processImportJob(_job: ImportJob): Promise<{ ok: false; reason: string }> {
  return { ok: false, reason: "Import nog niet geïmplementeerd — architectuur voorbereid." };
}

export const IMPORT_SOURCES: { id: ImportSourceKind; label: string }[] = [
  { id: "photo", label: "Foto of screenshot" },
  { id: "pdf", label: "PDF-document" },
  { id: "email", label: "E-mail doorsturen" },
];
