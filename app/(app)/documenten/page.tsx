import { requireSnapshot } from "@/lib/auth/session";
import { documentCategoryLabel } from "@/lib/domain/labels";

export default async function DocumentsPage() {
  const snapshot = await requireSnapshot();
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Documenten</h1>
      <p className="mt-2 max-w-xl text-[color:var(--nest-muted)]">
        Bestanden blijven binnen het gezin. Upload naar Supabase Storage werkt zodra het project is gekoppeld;
        paden worden gecontroleerd op `family_id`.
      </p>
      <div className="mt-6 space-y-3">
        {snapshot.documents.map((doc) => (
          <article key={doc.id} className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--nest-muted)]">
              {documentCategoryLabel[doc.category]}
            </p>
            <p className="text-lg font-medium">{doc.title}</p>
            <p className="text-sm text-[color:var(--nest-muted)]">
              {doc.childId
                ? snapshot.children.find((child) => child.id === doc.childId)?.firstName
                : "Hele gezin"}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
