type MemoryBlob = {
  data: Buffer;
  mimeType: string;
};

const globalForBlobs = globalThis as unknown as { famliMemoryBlobs?: Map<string, MemoryBlob> };

function blobStore(): Map<string, MemoryBlob> {
  if (!globalForBlobs.famliMemoryBlobs) {
    globalForBlobs.famliMemoryBlobs = new Map();
  }
  return globalForBlobs.famliMemoryBlobs;
}

export function putMemoryBlob(path: string, data: Buffer, mimeType: string): void {
  blobStore().set(path, { data, mimeType });
}

export function getMemoryBlob(path: string): MemoryBlob | null {
  return blobStore().get(path) ?? null;
}

export function deleteMemoryBlob(path: string): void {
  blobStore().delete(path);
}

/** Test helper */
export function clearMemoryBlobsForTests(): void {
  blobStore().clear();
}
