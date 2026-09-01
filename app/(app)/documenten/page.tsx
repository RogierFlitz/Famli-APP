import { requireSnapshot } from "@/lib/auth/session";
import { DocumentUploadPanel } from "@/components/documents/document-upload";
import { PageHeader } from "@/components/ui/page-header";

export default async function DocumentsPage() {
  const snapshot = await requireSnapshot();
  return (
    <div className="famli-page">
      <PageHeader
        title="Documenten"
        subtitle="Bestanden blijven binnen het gezin. Alleen gezinsleden met toegang kunnen ze openen."
      />
      <DocumentUploadPanel snapshot={snapshot} />
    </div>
  );
}
