"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatEuro } from "@/lib/money";
import { parentName } from "@/lib/queries/family-view";
import { markSplitPaidAction } from "@/lib/actions/family";
import { EmptyState } from "@/components/empty-state";
import { CollapsibleSection, ExpandableList } from "@/components/ui/collapsible-section";
import type { Expense, ExpenseSplit, FamilySnapshot } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type CostItem = {
  expense: Expense;
  related: ExpenseSplit[];
  open: boolean;
};

function ExpenseCard({
  snapshot,
  expense,
  related,
  open,
  focusId,
  me,
}: {
  snapshot: FamilySnapshot;
  expense: Expense;
  related: ExpenseSplit[];
  open: boolean;
  focusId?: string;
  me: string;
}) {
  const child = snapshot.children.find((item) => item.id === expense.childId);
  const otherSplit = related.find((split) => split.memberId !== expense.paidByMemberId);
  const mine = related.find(
    (split) => split.memberId === me && split.status === "pending" && expense.paidByMemberId !== me,
  );
  const mySplit = related.find((split) => split.memberId === me);

  return (
    <article
      key={expense.id}
      id={expense.id}
      className={cn("famli-card", !open && "opacity-80", focusId === expense.id && "ring-2 ring-[color:var(--famli-brand)]")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn("text-lg font-semibold", !open && "line-through")}>{expense.description}</p>
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
      {!open ? (
        <p className="mt-3 text-sm text-[color:var(--famli-muted)]">
          ✓ {mySplit?.status === "paid" ? "Betaald" : "Afgerond"}
        </p>
      ) : null}
    </article>
  );
}

export function CostList({
  snapshot,
  focusId,
}: {
  snapshot: FamilySnapshot;
  focusId?: string;
}) {
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const me = snapshot.currentMember.id;

  const allItems = useMemo<CostItem[]>(() => {
    return snapshot.expenses
      .filter((item) => !item.voidedAt)
      .map((expense) => {
        const related = snapshot.splits.filter((split) => split.expenseId === expense.id);
        const open = related.some((split) => split.status === "pending");
        return { expense, related, open };
      });
  }, [snapshot]);

  const openItems = useMemo(() => allItems.filter((item) => item.open), [allItems]);
  const doneItems = useMemo(
    () => allItems.filter((item) => !item.open).sort((a, b) => b.expense.updatedAt.localeCompare(a.expense.updatedAt)),
    [allItems],
  );

  const filteredItems = useMemo(() => {
    if (filter === "open") return openItems;
    if (filter === "done") return doneItems;
    return allItems;
  }, [filter, allItems, openItems, doneItems]);

  const showSplitSections = filter === "all";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: "open", label: "Openstaand" },
          { id: "all", label: "Alles" },
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

      {!allItems.length ? (
        <EmptyState
          title="Nog geen kosten toegevoegd"
          body={`Gedeelde kosten verschijnen hier zodra jij of ${parentName(snapshot, snapshot.members.find((member) => member.id !== me)?.id ?? me)} iets toevoegt.`}
          actionHref="/kosten#toevoegen"
          actionLabel="Kosten toevoegen"
        />
      ) : null}

      {showSplitSections ? (
        <div className="space-y-4">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Openstaand ({openItems.length})</h2>
            {openItems.length ? (
              openItems.map(({ expense, related, open }) => (
                <ExpenseCard
                  key={expense.id}
                  snapshot={snapshot}
                  expense={expense}
                  related={related}
                  open={open}
                  focusId={focusId}
                  me={me}
                />
              ))
            ) : (
              <p className="text-sm text-[color:var(--famli-muted)]">Geen openstaande kosten.</p>
            )}
          </section>
          {doneItems.length ? (
            <CollapsibleSection title="Afgerond" count={doneItems.length}>
              <ExpandableList
                items={doneItems}
                initialLimit={20}
                renderItem={({ expense, related, open }) => (
                  <ExpenseCard
                    key={expense.id}
                    snapshot={snapshot}
                    expense={expense}
                    related={related}
                    open={open}
                    focusId={focusId}
                    me={me}
                  />
                )}
              />
            </CollapsibleSection>
          ) : null}
        </div>
      ) : (
        <>
          {!filteredItems.length ? (
            <EmptyState
              title={filter === "open" ? "Geen openstaande kosten" : "Nog niets afgerond"}
              body={
                filter === "open"
                  ? "Alle gedeelde kosten zijn verrekend."
                  : "Afgeronde betalingen verschijnen hier zodra iets is voldaan."
              }
            />
          ) : null}
          {filteredItems.map(({ expense, related, open }) => (
            <ExpenseCard
              key={expense.id}
              snapshot={snapshot}
              expense={expense}
              related={related}
              open={open}
              focusId={focusId}
              me={me}
            />
          ))}
        </>
      )}
    </div>
  );
}
