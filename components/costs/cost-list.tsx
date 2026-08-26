"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatEuro } from "@/lib/money";
import { parentName } from "@/lib/queries/family-view";
import { markSplitPaidAction } from "@/lib/actions/family";
import { EmptyState } from "@/components/empty-state";
import type { FamilySnapshot } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function CostList({
  snapshot,
  focusId,
}: {
  snapshot: FamilySnapshot;
  focusId?: string;
}) {
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const me = snapshot.currentMember.id;

  const items = useMemo(() => {
    return snapshot.expenses
      .filter((item) => !item.voidedAt)
      .map((expense) => {
        const related = snapshot.splits.filter((split) => split.expenseId === expense.id);
        const open = related.some((split) => split.status === "pending");
        return { expense, related, open };
      })
      .filter((item) => (filter === "open" ? item.open : filter === "done" ? !item.open : true));
  }, [snapshot, filter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: "all", label: "Alles" },
          { id: "open", label: "Openstaand" },
          { id: "done", label: "Afgerond" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id as typeof filter)}
            className={cn(
              "h-10 rounded-full px-4 text-sm",
              filter === item.id ? "bg-[color:var(--famli-ink)] text-white" : "border border-[color:var(--famli-border)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {!items.length ? (
        <EmptyState
          title="Nog geen kosten toegevoegd"
          body={`Gedeelde kosten verschijnen hier zodra jij of ${parentName(snapshot, snapshot.members.find((member) => member.id !== me)?.id ?? me)} iets toevoegt.`}
          actionHref="/kosten#toevoegen"
          actionLabel="Kosten toevoegen"
        />
      ) : null}
      {items.map(({ expense, related, open }) => {
        const child = snapshot.children.find((item) => item.id === expense.childId);
        const otherSplit = related.find((split) => split.memberId !== expense.paidByMemberId);
        const mine = related.find((split) => split.memberId === me && split.status === "pending" && expense.paidByMemberId !== me);
        return (
          <article
            key={expense.id}
            id={expense.id}
            className={cn("famli-card", focusId === expense.id && "ring-2 ring-[color:var(--famli-brand)]")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{expense.description}</p>
                {child ? <p className="text-sm text-[color:var(--famli-muted)]">{child.firstName}</p> : null}
                <p className="mt-2 text-2xl font-semibold">{formatEuro(expense.amountCents)}</p>
                <p className="mt-2 text-sm text-[color:var(--famli-muted)]">
                  Betaald door: {parentName(snapshot, expense.paidByMemberId)}
                </p>
                <p className="text-sm text-[color:var(--famli-muted)]">
                  Verdeling: {related.map((split) => `${Math.round(split.sharePercent)}`).join(" / ")}
                </p>
                {otherSplit ? (
                  <p className="mt-2 font-medium">
                    {parentName(snapshot, otherSplit.memberId)}: {formatEuro(otherSplit.shareCents)}{" "}
                    {otherSplit.status === "pending" ? "openstaand" : "voldaan"}
                  </p>
                ) : null}
              </div>
              <Link href={`/kosten?id=${expense.id}`} className="text-sm font-medium text-[color:var(--famli-brand)]">
                Bekijk
              </Link>
            </div>
            {mine ? (
              <form action={markSplitPaidAction} className="mt-4">
                <input type="hidden" name="splitId" value={mine.id} />
                <button className="famli-btn famli-btn-secondary h-11 px-4">Beoordelen</button>
              </form>
            ) : null}
            {!open ? <p className="mt-3 text-sm text-[color:var(--famli-muted)]">Afgerond</p> : null}
          </article>
        );
      })}
    </div>
  );
}
