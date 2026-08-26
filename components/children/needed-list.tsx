"use client";

import { useState } from "react";
import { toast } from "sonner";
import { neededCategoryLabel, neededStatusLabel } from "@/lib/domain/labels";
import { formatEuro } from "@/lib/money";
import { formatDayLong } from "@/lib/dates";
import { neededHeadline } from "@/lib/queries/child-life";
import { parentName } from "@/lib/queries/family-view";
import {
  claimNeededAction,
  createNeededAction,
  neededToExpenseAction,
  purchaseNeededAction,
} from "@/lib/actions/life";
import type { FamilySnapshot, NeededItem } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function NeededList({
  snapshot,
  items,
  childId,
  giftsOnly = false,
  compact = false,
}: {
  snapshot: FamilySnapshot;
  items: NeededItem[];
  childId?: string;
  giftsOnly?: boolean;
  compact?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const canEdit = snapshot.currentMember.role !== "viewer";
  const visible = items.filter((item) => (giftsOnly ? item.category === "cadeau" : item.category !== "cadeau" || !compact));

  return (
    <div className="space-y-3">
      {visible.map((item) => (
        <NeededCard key={item.id} snapshot={snapshot} item={item} canEdit={canEdit} />
      ))}
      {!visible.length ? (
        <p className="text-sm text-[color:var(--famli-muted)]">
          {giftsOnly ? "Nog geen cadeaus op de lijst." : "Niets openstaand."}
        </p>
      ) : null}
      {canEdit && !compact ? (
        adding ? (
          <form
            className="famli-card space-y-2"
            action={async (formData) => {
              if (childId) formData.set("childId", childId);
              if (giftsOnly) {
                formData.set("category", "cadeau");
                formData.set("hiddenFromChild", "true");
              }
              await createNeededAction(formData);
              toast.success(giftsOnly ? "Cadeau toegevoegd" : "Toegevoegd aan Nodig");
              setAdding(false);
            }}
          >
            <input name="title" required placeholder={giftsOnly ? "Cadeau-idee" : "Wat is er nodig?"} className="famli-input" />
            {!giftsOnly ? (
              <select name="category" className="famli-input" defaultValue="kleding">
                {Object.entries(neededCategoryLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : null}
            {!childId ? (
              <select name="childId" className="famli-input" defaultValue={snapshot.children[0]?.id}>
                {snapshot.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.firstName}
                  </option>
                ))}
              </select>
            ) : null}
            <input name="size" placeholder="Maat" className="famli-input" />
            <input name="dueOn" type="date" className="famli-input" />
            <input name="budget" placeholder="Budget" inputMode="decimal" className="famli-input" />
            <select name="assigneeMemberId" className="famli-input">
              <option value="">Nog niemand</option>
              {snapshot.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {parentName(snapshot, member.id)}
                </option>
              ))}
            </select>
            <textarea name="notes" placeholder="Notitie" className="famli-input" />
            {giftsOnly ? (
              <label className="flex items-center gap-2 text-sm text-[color:var(--famli-muted)]">
                <input type="checkbox" name="hiddenFromChild" value="true" defaultChecked />
                Verborgen voor kind
              </label>
            ) : null}
            <div className="flex gap-2">
              <button className="famli-btn famli-btn-primary flex-1">Opslaan</button>
              <button type="button" className="famli-btn famli-btn-secondary" onClick={() => setAdding(false)}>
                Annuleren
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="famli-btn famli-btn-secondary h-11 px-4" onClick={() => setAdding(true)}>
            {giftsOnly ? "Cadeau toevoegen" : "Iets nodig"}
          </button>
        )
      ) : null}
    </div>
  );
}

function NeededCard({
  snapshot,
  item,
  canEdit,
}: {
  snapshot: FamilySnapshot;
  item: NeededItem;
  canEdit: boolean;
}) {
  const [buying, setBuying] = useState(false);
  const child = snapshot.children.find((row) => row.id === item.childId);
  const headline = neededHeadline(item, snapshot);

  return (
    <article className="famli-card space-y-2">
      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
        {neededCategoryLabel[item.category]}
      </p>
      <p className="text-lg font-medium">{item.title}</p>
      <p className="text-sm text-[color:var(--famli-muted)]">
        {[child?.firstName, item.size ? `Maat ${item.size}` : null, item.dueOn ? `vóór ${formatDayLong(item.dueOn)}` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="text-sm font-medium">{headline}</p>
      {item.budgetCents ? (
        <p className="text-sm text-[color:var(--famli-muted)]">Budget {formatEuro(item.budgetCents)}</p>
      ) : null}
      {item.priceCents ? (
        <p className="text-sm text-[color:var(--famli-muted)]">Betaald {formatEuro(item.priceCents)}</p>
      ) : null}
      {item.notes ? <p className="text-sm">{item.notes}</p> : null}
      {canEdit && item.status !== "gekocht" && item.status !== "niet_meer_nodig" ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {item.assigneeMemberId !== snapshot.currentMember.id ? (
            <form
              action={async (formData) => {
                await claimNeededAction(formData);
                toast.success("Jij regelt dit");
              }}
            >
              <input type="hidden" name="id" value={item.id} />
              <button className="famli-btn famli-btn-primary h-10 px-4">Ik regel dit</button>
            </form>
          ) : null}
          <button type="button" className="famli-btn famli-btn-secondary h-10 px-4" onClick={() => setBuying((value) => !value)}>
            Markeer als gekocht
          </button>
        </div>
      ) : null}
      {buying ? (
        <form
          className="space-y-2 pt-1"
          action={async (formData) => {
            await purchaseNeededAction(formData);
            toast.success(neededStatusLabel.gekocht);
            setBuying(false);
          }}
        >
          <input type="hidden" name="id" value={item.id} />
          <input name="price" placeholder="Prijs" inputMode="decimal" className="famli-input" />
          <input name="receipt" type="file" accept="image/*,.pdf" className="famli-input pt-3 text-sm" />
          <button className="famli-btn famli-btn-primary w-full">Gekocht</button>
        </form>
      ) : null}
      {canEdit && item.status === "gekocht" && !item.expenseId && snapshot.currentMember.role !== "viewer" ? (
        <form
          action={async (formData) => {
            await neededToExpenseAction(formData);
            toast.success("Toegevoegd aan kosten");
          }}
        >
          <input type="hidden" name="id" value={item.id} />
          <button className="famli-btn famli-btn-secondary h-10 px-4">Ook als kosten toevoegen</button>
        </form>
      ) : null}
    </article>
  );
}

export function NeededStatusChip({ item, snapshot }: { item: NeededItem; snapshot: FamilySnapshot }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs",
        item.status === "gekocht" ? "bg-[color:var(--famli-bg)]" : "bg-[color:var(--famli-brand-soft)]",
      )}
    >
      {neededHeadline(item, snapshot)}
    </span>
  );
}
