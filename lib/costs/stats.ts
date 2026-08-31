import { formatEuro } from "@/lib/money";
import type { Expense, ExpenseSplit, FamilySnapshot } from "@/lib/domain/types";
import { balanceForMember, computeBalances } from "@/lib/costs/balance";
import { otherParent, parentName } from "@/lib/queries/family-view";

export type CostPeriod = "all" | "month" | "last30";

export function isExpenseOpen(expense: Expense, splits: ExpenseSplit[]): boolean {
  if (expense.voidedAt) return false;
  return splits.some((split) => split.expenseId === expense.id && split.status === "pending");
}

export function expensesInPeriod(expenses: Expense[], period: CostPeriod, now = new Date()): Expense[] {
  const active = expenses.filter((item) => !item.voidedAt);
  if (period === "all") return active;
  const start =
    period === "month"
      ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return active.filter((item) => item.date >= start);
}

export function costStats(snapshot: FamilySnapshot, now = new Date()) {
  const me = snapshot.currentMember.id;
  const other = otherParent(snapshot);
  const month = expensesInPeriod(snapshot.expenses, "month", now);
  const monthTotal = month.reduce((sum, item) => sum + item.amountCents, 0);
  const paidByMe = month.filter((item) => item.paidByMemberId === me).reduce((sum, item) => sum + item.amountCents, 0);
  const paidByOther = month
    .filter((item) => item.paidByMemberId === other.id)
    .reduce((sum, item) => sum + item.amountCents, 0);
  const outstanding = Math.abs(balanceForMember(snapshot.expenses, snapshot.splits, me));
  return {
    monthTotal,
    paidByMe,
    paidByOther,
    outstanding,
    otherName: parentName(snapshot, other.id),
  };
}

export function namedCostHeadline(snapshot: FamilySnapshot) {
  const me = snapshot.currentMember.id;
  const myName = snapshot.currentProfile.firstName;
  const other = otherParent(snapshot);
  const otherName = parentName(snapshot, other.id);
  const balances = computeBalances(snapshot.expenses, snapshot.splits);
  const mine = balances.find((row) => row.memberId === me)?.netCents ?? 0;
  if (mine > 0) {
    return {
      title: `${myName} krijgt ${formatEuro(mine)}`,
      subtitle: `${otherName} heeft dit nog openstaan`,
      net: mine,
    };
  }
  if (mine < 0) {
    return {
      title: `${myName} moet ${formatEuro(Math.abs(mine))} betalen`,
      subtitle: `Openstaand aan ${otherName}`,
      net: mine,
    };
  }
  return { title: "Jullie staan gelijk", subtitle: "Geen openstaande verdeling", net: 0 };
}
