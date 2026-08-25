import type { Expense, ExpenseSplit } from "@/lib/domain/types";

export interface MemberBalance {
  memberId: string;
  netCents: number;
}

export function computeBalances(
  expenses: Expense[],
  splits: ExpenseSplit[],
): MemberBalance[] {
  const nets = new Map<string, number>();

  const active = expenses.filter((expense) => !expense.voidedAt);
  for (const expense of active) {
    const related = splits.filter((split) => split.expenseId === expense.id);
    for (const split of related) {
      if (split.status === "waived" || split.status === "paid") continue;
      if (split.memberId === expense.paidByMemberId) continue;
      nets.set(
        expense.paidByMemberId,
        (nets.get(expense.paidByMemberId) ?? 0) + split.shareCents,
      );
      nets.set(split.memberId, (nets.get(split.memberId) ?? 0) - split.shareCents);
    }
  }

  return [...nets.entries()].map(([memberId, netCents]) => ({
    memberId,
    netCents,
  }));
}

export function balanceForMember(
  expenses: Expense[],
  splits: ExpenseSplit[],
  memberId: string,
): number {
  return (
    computeBalances(expenses, splits).find((row) => row.memberId === memberId)
      ?.netCents ?? 0
  );
}
