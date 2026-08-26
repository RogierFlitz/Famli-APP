"use client";

import Link from "next/link";
import { formatDayLong } from "@/lib/dates";
import { expenseCategoryLabel } from "@/lib/domain/labels";
import { formatEuro } from "@/lib/money";
import { parentName } from "@/lib/queries/family-view";
import { markSplitPaidAction } from "@/lib/actions/family";
import type { Expense, ExpenseSplit, FamilySnapshot } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { ContextMessages } from "@/components/messages/context-messages";

function splitStatusLabel(status: ExpenseSplit["status"]): string {
  if (status === "pending") return "Openstaand";
  if (status === "paid") return "Voldaan";
  return "Kwijtgescholden";
}

export function ExpenseDetail({
  snapshot,
  expense,
  related,
  me,
}: {
  snapshot: FamilySnapshot;
  expense: Expense;
  related: ExpenseSplit[];
  me: string;
}) {
  const child = snapshot.children.find((item) => item.id === expense.childId);
  const open = related.some((split) => split.status === "pending");
  const mine = related.find(
    (split) => split.memberId === me && split.status === "pending" && expense.paidByMemberId !== me,
  );

  return (
    <div className="space-y-4 text-sm">
      <p className="text-3xl font-semibold">{formatEuro(expense.amountCents)}</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[color:var(--famli-bg)] p-3">
          <p className="text-xs text-[color:var(--famli-muted)]">Datum</p>
          <p className="font-medium">{formatDayLong(expense.date)}</p>
        </div>
        <div className="rounded-2xl bg-[color:var(--famli-bg)] p-3">
          <p className="text-xs text-[color:var(--famli-muted)]">Status</p>
          <p className="font-medium">{open ? "Openstaand" : "Afgerond"}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4 space-y-2">
        <p>
          <span className="text-[color:var(--famli-muted)]">Betaald door: </span>
          <span className="font-medium">{parentName(snapshot, expense.paidByMemberId)}</span>
        </p>
        {child ? (
          <p>
            <span className="text-[color:var(--famli-muted)]">Kind: </span>
            <span className="font-medium">{child.firstName}</span>
          </p>
        ) : null}
        <p>
          <span className="text-[color:var(--famli-muted)]">Categorie: </span>
          <span className="font-medium">{expenseCategoryLabel[expense.category]}</span>
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">
          Verdeling
        </p>
        <div className="space-y-2">
          {related.map((split) => (
            <div
              key={split.id}
              className={cn(
                "flex items-center justify-between rounded-2xl border px-4 py-3",
                split.status === "pending"
                  ? "border-[color:var(--famli-brand)]/30 bg-[color:var(--famli-brand-soft)]/30"
                  : "border-[color:var(--famli-border)] bg-[color:var(--famli-card)]",
              )}
            >
              <div>
                <p className="font-medium">{parentName(snapshot, split.memberId)}</p>
                <p className="text-[color:var(--famli-muted)]">
                  {Math.round(split.sharePercent)}% · {formatEuro(split.shareCents)}
                </p>
              </div>
              <p
                className={cn(
                  "text-sm font-medium",
                  split.status === "pending" ? "text-[color:var(--famli-brand)]" : "text-[color:var(--famli-muted)]",
                )}
              >
                {splitStatusLabel(split.status)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {expense.notes ? (
        <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4">
          <p className="text-xs text-[color:var(--famli-muted)]">Notities</p>
          <p className="mt-1">{expense.notes}</p>
        </div>
      ) : null}

      <ContextMessages snapshot={snapshot} resourceType="expense" resourceId={expense.id} />

      <div className="flex flex-wrap gap-2 pt-2">
        {mine ? (
          <form action={markSplitPaidAction}>
            <input type="hidden" name="splitId" value={mine.id} />
            <button type="submit" className="famli-btn famli-btn-primary h-11 px-4">
              Markeer als betaald
            </button>
          </form>
        ) : null}
        {child ? (
          <Link href={`/kinderen/${child.id}`} className="famli-btn famli-btn-secondary h-11 px-4">
            Kinderprofiel
          </Link>
        ) : null}
      </div>
    </div>
  );
}
