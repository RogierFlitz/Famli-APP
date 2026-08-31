"use client";

import { toast } from "sonner";
import { documentCategoryLabel } from "@/lib/domain/labels";
import { uploadFamilyDocumentAction } from "@/lib/actions/family-hub";
import { EmptyState } from "@/components/empty-state";
import { formatDayLong } from "@/lib/dates";
import type { FamilySnapshot } from "@/lib/domain/types";

export function DocumentUploadPanel({
  snapshot,
  childId,
}: {
  snapshot: FamilySnapshot;
  childId?: string;
}) {
  const docs = snapshot.documents.filter((item) => (childId ? item.childId === childId : true));
  return (
    <div className="space-y-4">
      {docs.length ? (
        docs.map((doc) => (
          <a
            key={doc.id}
            href={doc.storagePath ? `/api/family-document/${doc.id}` : undefined}
            className="block rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
              {documentCategoryLabel[doc.category]}
            </p>
            <p className="font-medium">{doc.title}</p>
            <p className="text-sm text-[color:var(--famli-muted)]">
              {doc.childId
                ? snapshot.children.find((child) => child.id === doc.childId)?.firstName
                : "Hele gezin"}
              {doc.createdAt ? ` · ${formatDayLong(doc.createdAt.slice(0, 10))}` : ""}
            </p>
          </a>
        ))
      ) : (
        <EmptyState
          title="Nog geen documenten"
          body="Bewaar schoolbrieven, formulieren of verzekeringspapieren hier. Alleen jullie gezin kan ze zien."
        />
      )}
      <form
        className="famli-card space-y-3"
        action={async (formData) => {
          try {
            await uploadFamilyDocumentAction(formData);
            toast.success("Document opgeslagen");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Upload mislukt");
          }
        }}
      >
        <h3 className="font-semibold">Document toevoegen</h3>
        {childId ? <input type="hidden" name="childId" value={childId} /> : (
          <label className="block text-sm">
            Kind (optioneel)
            <select name="childId" className="famli-input mt-1" defaultValue="">
              <option value="">Hele gezin</option>
              {snapshot.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm">
          Titel
          <input name="title" required className="famli-input mt-1" />
        </label>
        <label className="block text-sm">
          Categorie
          <select name="category" className="famli-input mt-1" defaultValue="overig">
            <option value="school">School</option>
            <option value="verzekering">Verzekering</option>
            <option value="sport">Sport</option>
            <option value="medisch">Zorg</option>
            <option value="overeenkomst">Formulier</option>
            <option value="overig">Overig</option>
          </select>
        </label>
        <label className="block text-sm">
          Bestand
          <input name="file" type="file" required className="famli-input mt-1 pt-3 text-sm" />
        </label>
        <button className="famli-btn famli-btn-primary">Uploaden</button>
      </form>
    </div>
  );
}
