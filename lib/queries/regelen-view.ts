import { addDays } from "date-fns";
import { toISODate } from "@/lib/dates";
import { incomingChanges } from "@/lib/queries/family-view";
import type { FamilySnapshot, NeededItem, TaskItem } from "@/lib/domain/types";

export type RegelenBucket = "voor_jou" | "samen" | "verzoeken" | "later";

function isUrgentDue(dueAt: string | null | undefined, today: string, horizon: string): boolean {
  if (!dueAt) return false;
  const due = dueAt.slice(0, 10);
  return due >= today && due <= horizon;
}

export function tasksForBucket(snapshot: FamilySnapshot, bucket: RegelenBucket, now = new Date()): TaskItem[] {
  const today = toISODate(now);
  const horizon = toISODate(addDays(now, 7));
  const me = snapshot.currentMember.id;
  const other = snapshot.members.find((member) => member.id !== me)?.id;

  const open = snapshot.tasks.filter((task) => task.kind === "one_off" && task.status !== "done");

  if (bucket === "verzoeken") return [];

  if (bucket === "later") {
    return open.filter((task) => {
      const due = task.dueAt?.slice(0, 10);
      if (!due) return true;
      return due > horizon;
    });
  }

  if (bucket === "voor_jou") {
    return open.filter(
      (task) =>
        task.assigneeMemberId === me &&
        (isUrgentDue(task.dueAt, today, horizon) || !task.dueAt || task.dueAt.slice(0, 10) <= horizon),
    );
  }

  return open.filter((task) => {
    if (task.assigneeMemberId && task.assigneeMemberId !== me && task.assigneeMemberId !== other) return false;
    if (task.assigneeMemberId === me) return false;
    return isUrgentDue(task.dueAt, today, horizon) || !task.assigneeMemberId;
  });
}

export function neededForBucket(snapshot: FamilySnapshot, bucket: RegelenBucket): NeededItem[] {
  const me = snapshot.currentMember.id;
  const open = snapshot.neededItems.filter((item) => item.status !== "gekocht" && item.status !== "niet_meer_nodig");

  if (bucket === "voor_jou") {
    return open.filter((item) => item.assigneeMemberId === me || (item.status === "nodig" && !item.assigneeMemberId));
  }
  if (bucket === "samen") {
    return open.filter((item) => item.status === "nodig" && !item.assigneeMemberId);
  }
  if (bucket === "later") {
    return open.filter((item) => item.status === "wordt_geregeld" && item.assigneeMemberId && item.assigneeMemberId !== me);
  }
  return [];
}

export function changeRequestsForBucket(snapshot: FamilySnapshot, bucket: RegelenBucket) {
  if (bucket !== "verzoeken") return [];
  return incomingChanges(snapshot).concat(
    snapshot.changeRequests.filter(
      (item) =>
        (item.status === "pending" || item.status === "alternative_proposed") &&
        item.requestedByMemberId === snapshot.currentMember.id,
    ),
  );
}

export function completedNeededItems(snapshot: FamilySnapshot, daysBack = 14) {
  const cutoff = toISODate(addDays(new Date(), -daysBack));
  return snapshot.neededItems
    .filter((item) => item.status === "gekocht" && (item.purchasedAt?.slice(0, 10) ?? "") >= cutoff)
    .sort((a, b) => (b.purchasedAt ?? "").localeCompare(a.purchasedAt ?? ""));
}
