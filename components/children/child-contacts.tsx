"use client";

import { toast } from "sonner";
import { childContactCategoryLabel } from "@/lib/domain/labels";
import { addChildContactAction } from "@/lib/actions/family-hub";
import { EmptyState } from "@/components/empty-state";
import type { FamilySnapshot } from "@/lib/domain/types";

export function ChildContactsPanel({ snapshot, childId }: { snapshot: FamilySnapshot; childId: string }) {
  const contacts = snapshot.childContacts.filter((item) => item.childId === childId);
  return (
    <div className="space-y-4">
      {contacts.length ? (
        contacts.map((item) => (
          <article key={item.id} className="famli-card space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
              {childContactCategoryLabel[item.category]}
            </p>
            <p className="text-lg font-medium">{item.name}</p>
            {item.organization ? <p className="text-sm">{item.organization}</p> : null}
            {item.phone ? (
              <a href={`tel:${item.phone}`} className="block text-[color:var(--famli-brand)]">
                {item.phone}
              </a>
            ) : null}
            {item.email ? (
              <a href={`mailto:${item.email}`} className="block text-[color:var(--famli-brand)]">
                {item.email}
              </a>
            ) : null}
            {item.address ? <p className="text-sm text-[color:var(--famli-muted)]">{item.address}</p> : null}
            {item.notes ? <p className="text-sm text-[color:var(--famli-muted)]">{item.notes}</p> : null}
          </article>
        ))
      ) : (
        <EmptyState title="Nog geen contacten" body="Zet hier school, huisarts, sportclub of oppas." />
      )}
      <form
        className="famli-card space-y-3"
        action={async (formData) => {
          try {
            await addChildContactAction(formData);
            toast.success("Contact toegevoegd");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Opslaan mislukt");
          }
        }}
      >
        <h3 className="font-semibold">Contact toevoegen</h3>
        <input type="hidden" name="childId" value={childId} />
        <label className="block text-sm">
          Categorie
          <select name="category" className="famli-input mt-1" defaultValue="overig">
            {Object.entries(childContactCategoryLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Naam
          <input name="name" required className="famli-input mt-1" />
        </label>
        <label className="block text-sm">
          Organisatie
          <input name="organization" className="famli-input mt-1" />
        </label>
        <label className="block text-sm">
          Telefoon
          <input name="phone" type="tel" className="famli-input mt-1" />
        </label>
        <label className="block text-sm">
          E-mail
          <input name="email" type="email" className="famli-input mt-1" />
        </label>
        <label className="block text-sm">
          Adres
          <input name="address" className="famli-input mt-1" />
        </label>
        <label className="block text-sm">
          Notitie
          <textarea name="notes" className="famli-input mt-1" />
        </label>
        <button className="famli-btn famli-btn-primary">Opslaan</button>
      </form>
    </div>
  );
}
