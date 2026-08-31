import { requireSnapshot } from "@/lib/auth/session";
import { DocumentUploadPanel } from "@/components/documents/document-upload";

export default async function DocumentsPage() {
  const snapshot = await requireSnapshot();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Documenten</h1>
        <p className="mt-2 max-w-xl text-[color:var(--famli-muted)]">
          Bestanden blijven binnen het gezin. Alleen gezinsleden met toegang kunnen ze openen.
        </p>
      </header>
      <DocumentUploadPanel snapshot={snapshot} />
    </div>
  );
}
