import { randomBytes } from "crypto";

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export interface UploadValidationInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export function extensionOf(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

export function validateUpload(input: UploadValidationInput): void {
  const ext = extensionOf(input.filename);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("Bestandstype niet toegestaan. Alleen PDF, JPG, PNG en WEBP.");
  }
  if (!ALLOWED_MIME_TYPES.has(input.mimeType.toLowerCase())) {
    throw new Error("MIME-type niet toegestaan.");
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error("Bestand is te groot (max 10 MB).");
  }
}

/** Random storage filename — never trust client-provided names on disk. */
export function randomStorageFilename(originalFilename: string): string {
  const ext = extensionOf(originalFilename);
  const token = randomBytes(16).toString("hex");
  return ext ? `${token}.${ext}` : token;
}

export function storagePathForDocument(familyId: string, filename: string): string {
  return `${familyId}/${filename}`;
}

/** Signed URL TTL: 5–15 minutes (seconds). */
export const SIGNED_URL_TTL_SECONDS = 600;
