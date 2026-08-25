import { formatEuro } from "@/lib/money";
import { memberLabel } from "@/lib/custody/generate";
import type { FamilySnapshot } from "@/lib/domain/types";
import { toISODate } from "@/lib/dates";

/**
 * Structured family context for a future assistant.
 * Keep this pure and serializable — no chatbot is wired yet.
 */
export function buildFamilyQueryContext(snapshot: FamilySnapshot, now = new Date()) {
  const today = toISODate(now);
  const openTasks = snapshot.tasks.filter((task) => task.status !== "done");
  const pendingChanges = snapshot.changeRequests.filter(
    (item) => item.status === "pending" || item.status === "alternative_proposed",
  );
  const openSplits = snapshot.splits.filter((split) => split.status === "pending");

  return {
    asOf: now.toISOString(),
    familyId: snapshot.family.id,
    familyName: snapshot.family.name,
    askedBy: snapshot.currentProfile.firstName,
    children: snapshot.children.map((child) => ({
      id: child.id,
      name: child.firstName,
      school: child.school,
      sports: child.sports,
    })),
    todayCustody: snapshot.occurrences
      .filter((item) => item.date === today)
      .map((item) => ({
        date: item.date,
        with: memberLabel(snapshot.members, item.custodianMemberId),
      })),
    upcomingHandovers: snapshot.handovers
      .filter((item) => item.date >= today && !item.cancelledAt)
      .slice(0, 8)
      .map((item) => ({
        date: item.date,
        time: item.time,
        from: memberLabel(snapshot.members, item.fromMemberId),
        to: memberLabel(snapshot.members, item.toMemberId),
        location: item.location,
        pickup: item.pickupMemberId
          ? memberLabel(snapshot.members, item.pickupMemberId)
          : null,
        packingList: item.packingList,
      })),
    openTasks: openTasks.map((task) => ({
      title: task.title,
      dueAt: task.dueAt,
      childId: task.childId,
      status: task.status,
    })),
    pendingChangeRequests: pendingChanges.map((item) => ({
      type: item.type,
      targetDate: item.targetDate,
      message: item.message,
      status: item.status,
    })),
    yearSportsCostsCents: snapshot.expenses
      .filter(
        (expense) =>
          !expense.voidedAt &&
          expense.category === "sport" &&
          expense.date.startsWith(String(now.getFullYear())),
      )
      .reduce((sum, expense) => sum + expense.amountCents, 0),
    openPayments: openSplits.length,
    currencyHint: formatEuro(0).replace("0,00", "").trim(),
  };
}

export const futureAssistantQuestions = [
  "Wanneer zijn de kinderen volgende week bij mij?",
  "Wie brengt Roxy donderdag naar hockey?",
  "Hoeveel sportkosten hebben we dit jaar gemaakt?",
  "Welke openstaande taken hebben we?",
  "Wanneer is het eerstvolgende vrije weekend?",
  "Welke wijzigingsverzoeken staan nog open?",
] as const;
