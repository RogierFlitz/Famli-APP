import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeBalances } from "@/lib/costs/balance";
import { costStats, expensesInPeriod, namedCostHeadline } from "@/lib/costs/stats";
import { allowsInAppNotification } from "@/lib/notifications/prefs";
import type { Expense, ExpenseSplit, FamilySnapshot } from "@/lib/domain/types";

function expense(partial: Partial<Expense> & Pick<Expense, "id" | "paidByMemberId" | "amountCents" | "date">): Expense {
  return {
    familyId: "fam",
    description: "Test",
    currency: "EUR",
    childId: null,
    category: "school",
    receiptStoragePath: null,
    receiptFilename: null,
    receiptUploadedAt: null,
    receiptMimeType: null,
    notes: null,
    recurringExpenseId: null,
    voidedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    createdBy: "u1",
    ...partial,
  };
}

describe("cost stats and headline", () => {
  const expenses: Expense[] = [
    expense({ id: "e1", paidByMemberId: "a", amountCents: 10000, date: "2026-08-10" }),
  ];
  const splits: ExpenseSplit[] = [
    { id: "s1", expenseId: "e1", memberId: "a", shareCents: 5000, sharePercent: 50, paidAt: "x", status: "paid" },
    { id: "s2", expenseId: "e1", memberId: "b", shareCents: 5000, sharePercent: 50, paidAt: null, status: "pending" },
  ];

  it("computes outstanding for the payer", () => {
    const nets = computeBalances(expenses, splits);
    assert.equal(nets.find((row) => row.memberId === "a")?.netCents, 5000);
    assert.equal(nets.find((row) => row.memberId === "b")?.netCents, -5000);
  });

  it("filters this month", () => {
    const inMonth = expensesInPeriod(expenses, "month", new Date("2026-08-31T12:00:00Z"));
    assert.equal(inMonth.length, 1);
  });

  it("names who should pay", () => {
    const snapshot = {
      expenses,
      splits,
      currentMember: { id: "a" },
      currentProfile: { firstName: "Emma" },
      members: [
        { id: "a" },
        { id: "b" },
      ],
      profiles: {},
    } as unknown as FamilySnapshot;
    const headline = namedCostHeadline(snapshot);
    assert.match(headline.title, /krijgt/);
    const stats = costStats(snapshot, new Date("2026-08-31T12:00:00Z"));
    assert.equal(stats.monthTotal, 10000);
    assert.equal(stats.paidByMe, 10000);
  });
});

describe("notification preferences", () => {
  it("skips in-app when the category is off", () => {
    const prefs = {
      expense: { inApp: false, email: true, push: false },
    };
    assert.equal(allowsInAppNotification(prefs, "expense"), false);
    assert.equal(allowsInAppNotification(prefs, "invite_sent"), true);
  });
});
