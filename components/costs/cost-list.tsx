"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { expenseCategoryLabel } from "@/lib/domain/labels";
import { formatEuro } from "@/lib/money";
import { parentName } from "@/lib/queries/family-view";
import { markSplitPaidAction } from "@/lib/actions/family";
import { EmptyState } from "@/components/empty-state";
import { CostDetail } from "@/components/costs/cost-detail";
import { ResponsiveSheet } from "@/components/layout/responsive-sheet";
import { CollapsibleSection, ExpandableList } from "@/components/ui/collapsible-section";
import type { Expense, ExpenseSplit, FamilySnapshot } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type CostItem = {
  expense: Expense;
  related: ExpenseSplit[];
  open: boolean;
};

function hasReceipt(expense: Expense): boolean {
  return Boolean(expense.receiptStoragePath);
}

function ExpenseCard({
  snapshot,
  expense,
  related,
  open,
  focusId,
  me,
  onView,
}: {
  snapshot: FamilySnapshot;
  expense: Expense;
  related: ExpenseSplit[];
  open: boolean;
  focusId?: string;
  me: string;
  onView: (expenseId: string) => void;
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
      className={cn("famli-action-card", !open && "opacity-80", focusId === expense.id && "ring-2 ring-[color:var(--famli-brand)]")}
    >
      <div className="flex min-h-11 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
          <p className={cn("font-medium", !open && "line-through")}>{expense.description}</p>
            {hasReceipt(expense) ? (
              <Receipt className="size-4 shrink-0 text-[color:var(--famli-brand)]" aria-label="Bon toegevoegd" />
            ) : null}
          </div>
          <p className="text-sm text-[color:var(--famli-muted)]">
            {[child?.firstName ?? "Alle kinderen", expense.date, expenseCategoryLabel[expense.category], `Betaald door ${parentName(snapshot, expense.paidByMemberId)}`].join(" · ")}
          </p>
          <p className="mt-1 text-sm text-[color:var(--famli-muted)]">
            {open ? "Openstaand" : "Verrekend"}
            {otherSplit ? ` · ${parentName(snapshot, otherSplit.memberId)} ${formatEuro(otherSplit.shareCents)}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold tabular-nums">{formatEuro(expense.amountCents)}</p>
        <button
          type="button"
          onClick={() => onView(expense.id)}
          className="mt-1 min-h-11 text-sm font-medium text-[color:var(--famli-brand)]"
        >
          Bekijk
        </button>
        </div>
      </div>
      {mine ? (
        <form action={markSplitPaidAction} className="mt-4">
          <input type="hidden" name="splitId" value={mine.id} />
          <button className="famli-btn famli-btn-secondary h-11 px-4">Markeren als verrekend</button>
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
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const [childFilter, setChildFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "month" | "last30">("all");
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null);
  const selectedId = focusId ?? userSelectedId;
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
    const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
    const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let items = filter === "open" ? openItems : filter === "done" ? doneItems : allItems;
    if (childFilter === "all-children") {
      items = items.filter((item) => !item.expense.childId);
    } else if (childFilter !== "all") {
      items = items.filter((item) => item.expense.childId === childFilter);
    }
    if (categoryFilter !== "all") {
      items = items.filter((item) => item.expense.category === categoryFilter);
    }
    if (periodFilter === "month") {
      items = items.filter((item) => item.expense.date >= monthStart);
    } else if (periodFilter === "last30") {
      items = items.filter((item) => item.expense.date >= last30);
    }
    return items;
  }, [filter, allItems, openItems, doneItems, childFilter, categoryFilter, periodFilter]);

  const showSplitSections = filter === "all";
  const selectedItem = allItems.find((item) => item.expense.id === selectedId) ?? null;

  function openDetail(expenseId: string) {
    setUserSelectedId(expenseId);
    router.replace(`/kosten?id=${expenseId}`, { scroll: false });
  }

  function closeDetail() {
    setUserSelectedId(null);
    router.replace("/kosten", { scroll: false });
  }

  const cardProps = {
    snapshot,
    focusId,
    me,
    onView: openDetail,
  };

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
      <div className="flex flex-wrap gap-2">
        <select
          value={childFilter}
          onChange={(event) => setChildFilter(event.target.value)}
          className="h-10 rounded-full border border-[color:var(--famli-border)] bg-transparent px-3 text-sm"
        >
          <option value="all">Alle kinderen</option>
          <option value="all-children">Gedeeld voor alle kinderen</option>
          {snapshot.children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.firstName}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="h-10 rounded-full border border-[color:var(--famli-border)] bg-transparent px-3 text-sm"
        >
          <option value="all">Alle categorieën</option>
          {Object.entries(expenseCategoryLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={periodFilter}
          onChange={(event) => setPeriodFilter(event.target.value as "all" | "month" | "last30")}
          className="h-10 rounded-full border border-[color:var(--famli-border)] bg-transparent px-3 text-sm"
        >
          <option value="all">Alle periodes</option>
          <option value="month">Deze maand</option>
          <option value="last30">Laatste 30 dagen</option>
        </select>
      </div>

      {!allItems.length ? (
        <EmptyState
          title="Nog geen kosten toegevoegd"
          body="Voeg jullie eerste gedeelde kostenpost toe."
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
                  expense={expense}
                  related={related}
                  open={open}
                  {...cardProps}
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
                    expense={expense}
                    related={related}
                    open={open}
                    {...cardProps}
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
              expense={expense}
              related={related}
              open={open}
              {...cardProps}
            />
          ))}
        </>
      )}

      <ResponsiveSheet
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
        title={selectedItem?.expense.description ?? "Kosten"}
        wide
      >
        {selectedItem ? (
          <CostDetail
            snapshot={snapshot}
            expense={selectedItem.expense}
            related={selectedItem.related}
            open={selectedItem.open}
          />
        ) : null}
      </ResponsiveSheet>
    </div>
  );
}
