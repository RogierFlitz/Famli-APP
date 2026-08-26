import { addDays } from "date-fns";
import { formatTime } from "@/lib/dates";
import { MEDICAL_DISCLAIMER } from "@/lib/members/permissions";
import { parentName } from "@/lib/queries/family-view";
import { routineById } from "@/lib/routines/generate";
import type { FamilySnapshot, RoutineOccurrence, TaskItem } from "@/lib/domain/types";
import { toISODate } from "@/lib/dates";

export type DutyItem = {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  kind: "task" | "routine" | "care";
  routine?: TaskItem;
  occurrence?: RoutineOccurrence;
  task?: TaskItem;
  href: string;
  packingItems: string[];
  careInstructions?: string | null;
};

function occurrenceTitle(snapshot: FamilySnapshot, routine: TaskItem, occurrence: RoutineOccurrence) {
  const child = snapshot.children.find((item) => item.id === routine.childId);
  const label =
    routine.kind === "care"
      ? routine.careLabel ?? routine.title
      : routine.packingItems?.length
        ? `${routine.title}: ${routine.packingItems.join(", ")}`
        : routine.title;
  return child ? `${label} · ${child.firstName}` : label;
}

export function dutiesForMemberOn(
  snapshot: FamilySnapshot,
  memberId: string,
  date: string,
): DutyItem[] {
  const items: DutyItem[] = [];

  for (const task of snapshot.tasks.filter((item) => item.kind === "one_off" && item.status !== "done")) {
    const due = task.dueAt?.slice(0, 10);
    if (due !== date) continue;
    if (task.assigneeMemberId && task.assigneeMemberId !== memberId) continue;
    items.push({
      id: task.id,
      time: task.dueAt ? formatTime(task.dueAt) : "Hele dag",
      title: task.title,
      subtitle: task.childId
        ? snapshot.children.find((child) => child.id === task.childId)?.firstName ?? ""
        : "Gezin",
      kind: "task",
      task,
      href: `/regelen?tab=taken&id=${task.id}`,
      packingItems: [],
    });
  }

  for (const occurrence of snapshot.routineOccurrences.filter((item) => item.date === date)) {
    if (occurrence.assigneeMemberId && occurrence.assigneeMemberId !== memberId) continue;
    const routine = routineById(snapshot, occurrence.routineId);
    if (!routine || routine.active === false) continue;
    items.push({
      id: occurrence.id,
      time: occurrence.time,
      title: occurrenceTitle(snapshot, routine, occurrence),
      subtitle:
        routine.kind === "care"
          ? MEDICAL_DISCLAIMER
          : occurrence.assigneeMemberId
            ? `Voor ${parentName(snapshot, occurrence.assigneeMemberId).toLowerCase()}`
            : "",
      kind: routine.kind === "care" ? "care" : "routine",
      routine,
      occurrence,
      href: `/regelen?tab=routines&id=${occurrence.id}`,
      packingItems: routine.packingItems ?? [],
      careInstructions: routine.careInstructions,
    });
  }

  return items.sort((a, b) => a.time.localeCompare(b.time));
}

export function myDutiesToday(snapshot: FamilySnapshot, now = new Date()): DutyItem[] {
  return dutiesForMemberOn(snapshot, snapshot.currentMember.id, toISODate(now));
}

export function myOpenDutiesToday(snapshot: FamilySnapshot, now = new Date()): DutyItem[] {
  return myDutiesToday(snapshot, now).filter((item) =>
    item.kind === "task" ? item.task?.status !== "done" : item.occurrence?.status === "pending",
  );
}

export function myCompletedDutiesToday(snapshot: FamilySnapshot, now = new Date()): DutyItem[] {
  const date = toISODate(now);
  const memberId = snapshot.currentMember.id;
  const items: DutyItem[] = [];

  for (const task of snapshot.tasks.filter((item) => item.kind === "one_off" && item.status === "done")) {
    const due = task.dueAt?.slice(0, 10);
    if (due !== date) continue;
    if (task.assigneeMemberId && task.assigneeMemberId !== memberId) continue;
    items.push({
      id: task.id,
      time: task.dueAt ? formatTime(task.dueAt) : "Hele dag",
      title: task.title,
      subtitle: task.childId
        ? snapshot.children.find((child) => child.id === task.childId)?.firstName ?? ""
        : "Gezin",
      kind: "task",
      task,
      href: `/regelen?tab=taken&id=${task.id}`,
      packingItems: [],
    });
  }

  for (const occurrence of snapshot.routineOccurrences.filter((item) => item.date === date && item.status === "done")) {
    if (occurrence.assigneeMemberId && occurrence.assigneeMemberId !== memberId) continue;
    const routine = routineById(snapshot, occurrence.routineId);
    if (!routine || routine.active === false) continue;
    items.push({
      id: occurrence.id,
      time: occurrence.time,
      title: occurrenceTitle(snapshot, routine, occurrence),
      subtitle:
        routine.kind === "care"
          ? MEDICAL_DISCLAIMER
          : occurrence.assigneeMemberId
            ? `Voor ${parentName(snapshot, occurrence.assigneeMemberId).toLowerCase()}`
            : "",
      kind: routine.kind === "care" ? "care" : "routine",
      routine,
      occurrence,
      href: `/regelen?tab=routines&id=${occurrence.id}`,
      packingItems: routine.packingItems ?? [],
      careInstructions: routine.careInstructions,
    });
  }

  return items.sort((a, b) => a.time.localeCompare(b.time));
}

export function completedOneOffTasks(snapshot: FamilySnapshot, daysBack = 14) {
  const cutoff = toISODate(addDays(new Date(), -daysBack));
  return snapshot.tasks
    .filter(
      (item) =>
        item.kind === "one_off" &&
        item.status === "done" &&
        item.updatedAt.slice(0, 10) >= cutoff,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function completedRoutineOccurrences(snapshot: FamilySnapshot, daysBack = 14) {
  const cutoff = toISODate(addDays(new Date(), -daysBack));
  return snapshot.routineOccurrences
    .filter((item) => item.status === "done" && item.date >= cutoff)
    .sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
    });
}

export function childCompletedTasks(snapshot: FamilySnapshot, childId: string) {
  return snapshot.tasks
    .filter((item) => item.kind === "one_off" && item.childId === childId && item.status === "done")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function childCompletedRoutineOccurrences(snapshot: FamilySnapshot, childId: string, daysBack = 14) {
  const cutoff = toISODate(addDays(new Date(), -daysBack));
  return snapshot.routineOccurrences
    .filter((item) => {
      const routine = routineById(snapshot, item.routineId);
      return routine?.childId === childId && item.status === "done" && item.date >= cutoff;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
}

export function openCareForHandover(snapshot: FamilySnapshot, handoverDate: string) {
  return snapshot.routineOccurrences
    .filter((item) => item.date === handoverDate && item.status === "pending")
    .map((occurrence) => {
      const routine = routineById(snapshot, occurrence.routineId);
      if (!routine || routine.kind !== "care") return null;
      const child = snapshot.children.find((row) => row.id === routine.childId);
      return {
        id: occurrence.id,
        time: occurrence.time,
        title: `${routine.careLabel ?? routine.title}${child ? ` · ${child.firstName}` : ""}`,
        instructions: routine.careInstructions,
      };
    })
    .filter(Boolean) as { id: string; time: string; title: string; instructions: string | null | undefined }[];
}

export function markPastOccurrencesUnregistered(snapshot: FamilySnapshot, now = new Date()) {
  const today = toISODate(now);
  const cutoff = `${today}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  for (const occurrence of snapshot.routineOccurrences) {
    if (occurrence.status !== "pending") continue;
    if (occurrence.date > today) continue;
    if (occurrence.date === today && occurrence.time >= cutoff.slice(11, 16)) continue;
    occurrence.status = "unregistered";
  }
}

export function occurrenceStatusLabel(status: RoutineOccurrence["status"]) {
  if (status === "done") return "Afgerond";
  if (status === "unregistered") return "Nog niet geregistreerd";
  return "Open";
}

export function routinesOnly(snapshot: FamilySnapshot) {
  return snapshot.tasks.filter((item) => item.kind === "routine" || item.kind === "care");
}

export function upcomingRoutineOccurrences(snapshot: FamilySnapshot, fromDate: string, limit = 14) {
  return snapshot.routineOccurrences
    .filter((item) => item.date >= fromDate && item.status === "pending")
    .slice(0, limit);
}

export function childRoutineOccurrences(snapshot: FamilySnapshot, childId: string, fromDate: string) {
  return snapshot.routineOccurrences.filter((item) => {
    const routine = routineById(snapshot, item.routineId);
    return routine?.childId === childId && item.date >= fromDate;
  });
}
