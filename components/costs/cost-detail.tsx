"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDayLong } from "@/lib/dates";
import { formatEuro } from "@/lib/money";
import { expenseCategoryLabel } from "@/lib/domain/labels";
import { parentName } from "@/lib/queries/family-view";
import {
  getExpenseReceiptViewUrlAction,
  removeExpenseReceiptAction,
  uploadExpenseReceiptAction,
} from "@/lib/actions/expenses";
import { markSplitPaidAction } from "@/lib/actions/family";
import { updateExpenseAction, voidExpenseAction } from "@/lib/actions/family-hub";
import { memberPermissions } from "@/lib/members/permissions";
import type { Expense, ExpenseSplit, FamilySnapshot } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { FileText, Receipt } from "lucide-react";
import { toast } from "sonner";

function hasReceipt(expense: Expense): boolean {
  return Boolean(expense.receiptStoragePath);
}

function ReceiptSection({ expense, canEdit }: { expense: Expense; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = expense.receiptMimeType?.startsWith("image/");

  async function loadPreview() {
    const url = await getExpenseReceiptViewUrlAction(expense.id);
    if (url) setPreviewUrl(url);
  }

  function viewReceipt() {
    startTransition(async () => {
      try {
        const url = await getExpenseReceiptViewUrlAction(expense.id);
        if (!url) {
          toast.error("Bon kon niet worden geopend.");
          return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        toast.error("Bon kon niet worden geopend.");
      }
    });
  }

  return (
    <section className="rounded-2xl bg-[color:var(--famli-bg)] p-4">
      <div className="flex items-center gap-2">
        <Receipt className="size-4 text-[color:var(--famli-muted)]" />
        <h3 className="font-medium">Bon</h3>
      </div>

      {!hasReceipt(expense) ? (
        canEdit ? (
          <form
            className="mt-3 space-y-3"
            action={async (formData) => {
              startTransition(async () => {
                try {
                  await uploadExpenseReceiptAction(expense.id, formData);
                  toast.success("Bon geüpload");
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Upload mislukt");
                }
              });
            }}
          >
            <input
              name="receipt"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
              required
              className="famli-input pt-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--famli-brand)] file:px-3 file:py-1.5 file:text-sm file:text-white"
            />
            <button type="submit" disabled={pending} className="famli-btn famli-btn-secondary h-11 px-4">
              {pending ? "Uploaden…" : "Bon uploaden"}
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-[color:var(--famli-muted)]">Geen bon toegevoegd.</p>
        )
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-3">
            {isImage ? (
              previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={expense.receiptFilename ?? "Bon"}
                  className="size-16 rounded-xl border border-[color:var(--famli-border)] object-cover"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => void loadPreview()}
                  className="flex size-16 items-center justify-center rounded-xl border border-[color:var(--famli-border)] bg-white text-[color:var(--famli-muted)]"
                  aria-label="Voorbeeld laden"
                >
                  <Receipt className="size-6" />
                </button>
              )
            ) : (
              <div className="flex size-16 items-center justify-center rounded-xl border border-[color:var(--famli-border)] bg-white text-[color:var(--famli-muted)]">
                <FileText className="size-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{expense.receiptFilename ?? "Bon"}</p>
              {expense.receiptUploadedAt ? (
                <p className="text-sm text-[color:var(--famli-muted)]">
                  Geüpload op {formatDayLong(expense.receiptUploadedAt.slice(0, 10))}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={viewReceipt}
              disabled={pending}
              className="famli-btn famli-btn-secondary h-11 px-4"
            >
              Bekijk bon
            </button>
            {canEdit ? (
              <form
                action={async () => {
                  startTransition(async () => {
                    try {
                      await removeExpenseReceiptAction(expense.id);
                      setPreviewUrl(null);
                      toast.success("Bon verwijderd");
                      router.refresh();
                    } catch {
                      toast.error("Bon kon niet worden verwijderd");
                    }
                  });
                }}
              >
                <button type="submit" disabled={pending} className="famli-btn h-11 px-4">
                  Verwijderen
                </button>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

export function CostDetail({
  snapshot,
  expense,
  related,
}: {
  snapshot: FamilySnapshot;
  expense: Expense;
  related: ExpenseSplit[];
  open: boolean;
}) {
  const me = snapshot.currentMember.id;
  const child = snapshot.children.find((item) => item.id === expense.childId);
  const otherSplit = related.find((split) => split.memberId !== expense.paidByMemberId);
  const mine = related.find(
    (split) => split.memberId === me && split.status === "pending" && expense.paidByMemberId !== me,
  );
  const openSplits = related.some((split) => split.status === "pending");
  const canEdit = memberPermissions(snapshot.currentMember).editExpenses;
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-5 text-sm">
      {editing && canEdit ? (
        <form
          className="space-y-3"
          action={async (formData) => {
            try {
              await updateExpenseAction(formData);
              toast.success("Kostenpost bijgewerkt");
              setEditing(false);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Opslaan mislukt");
            }
          }}
        >
          <input type="hidden" name="id" value={expense.id} />
          <label className="block">
            Omschrijving
            <input name="description" defaultValue={expense.description} required className="famli-input mt-1" />
          </label>
          <label className="block">
            Datum
            <input name="date" type="date" defaultValue={expense.date} required className="famli-input mt-1" />
          </label>
          <label className="block">
            Kind
            <select name="childId" defaultValue={expense.childId ?? ""} className="famli-input mt-1">
              <option value="">Alle kinderen</option>
              {snapshot.children.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Categorie
            <select name="category" defaultValue={expense.category} className="famli-input mt-1">
              {Object.entries(expenseCategoryLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Opmerking
            <textarea name="notes" defaultValue={expense.notes ?? ""} className="famli-input mt-1" />
          </label>
          <div className="flex gap-2">
            <button className="famli-btn famli-btn-primary h-11 flex-1">Opslaan</button>
            <button type="button" className="famli-btn famli-btn-secondary h-11" onClick={() => setEditing(false)}>
              Annuleren
            </button>
          </div>
        </form>
      ) : null}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
          {expenseCategoryLabel[expense.category]}
        </p>
        <p className="mt-1 text-2xl font-semibold">{expense.description}</p>
        {child ? <p className="mt-1 text-[color:var(--famli-muted)]">Voor {child.firstName}</p> : (
          <p className="mt-1 text-[color:var(--famli-muted)]">Voor alle kinderen</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[color:var(--famli-bg)] p-3">
          <p className="text-xs text-[color:var(--famli-muted)]">Bedrag</p>
          <p className="text-xl font-semibold">{formatEuro(expense.amountCents)}</p>
        </div>
        <div className="rounded-2xl bg-[color:var(--famli-bg)] p-3">
          <p className="text-xs text-[color:var(--famli-muted)]">Datum</p>
          <p className="font-medium">{formatDayLong(expense.date)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p>
          <span className="text-[color:var(--famli-muted)]">Betaald door:</span>{" "}
          {parentName(snapshot, expense.paidByMemberId)}
        </p>
        <p>
          <span className="text-[color:var(--famli-muted)]">Verdeling:</span>{" "}
          {related.map((split) => `${Math.round(split.sharePercent)}%`).join(" / ")}
        </p>
        {otherSplit ? (
          <p className={cn("font-medium", !openSplits && "text-[color:var(--famli-muted)]")}>
            {parentName(snapshot, otherSplit.memberId)}: {formatEuro(otherSplit.shareCents)}{" "}
            {otherSplit.status === "pending" ? "openstaand" : "voldaan"}
          </p>
        ) : null}
      </div>

      {expense.notes ? (
        <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4">
          <p className="text-xs text-[color:var(--famli-muted)]">Notitie</p>
          <p className="mt-1">{expense.notes}</p>
        </div>
      ) : null}

      <ReceiptSection expense={expense} canEdit={canEdit} />

      {canEdit && !editing ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="famli-btn famli-btn-secondary h-11 px-4" onClick={() => setEditing(true)}>
            Bewerken
          </button>
          <form
            action={async (formData) => {
              try {
                await voidExpenseAction(formData);
                toast.success("Kostenpost verwijderd");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Verwijderen mislukt");
              }
            }}
          >
            <input type="hidden" name="id" value={expense.id} />
            <button className="famli-btn h-11 px-4 text-red-600">Verwijderen</button>
          </form>
        </div>
      ) : null}

      {mine ? (
        <form action={markSplitPaidAction}>
          <input type="hidden" name="splitId" value={mine.id} />
          <button className="famli-btn famli-btn-primary h-11 w-full px-4">Markeren als verrekend</button>
        </form>
      ) : null}
    </div>
  );
}
