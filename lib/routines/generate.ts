import { addDays, format, getISODay } from "date-fns";
import type {
  CustodyOccurrence,
  FamilySnapshot,
  RoutineOccurrence,
  TaskItem,
  TravelPlan,
} from "@/lib/domain/types";

function iso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function custodianOn(
  occurrences: CustodyOccurrence[],
  travelPlans: TravelPlan[],
  childId: string | null,
  date: string,
): string | null {
  if (childId) {
    const travel = travelPlans.find(
      (plan) =>
        plan.childIds.includes(childId) && plan.startsOn <= date && plan.endsOn >= date,
    );
    if (travel) return travel.withMemberId;
  }
  return occurrences.find((item) => item.date === date)?.custodianMemberId ?? null;
}

export function generateRoutineOccurrences(
  snapshot: Pick<
    FamilySnapshot,
    "tasks" | "occurrences" | "travelPlans" | "routineOccurrences" | "family"
  >,
  from: string,
  to: string,
): RoutineOccurrence[] {
  const routines = snapshot.tasks.filter(
    (task) => (task.kind === "routine" || task.kind === "care") && task.active !== false,
  );
  const existing = new Map(
    snapshot.routineOccurrences.map((item) => [`${item.routineId}:${item.date}:${item.time}`, item]),
  );
  const generated: RoutineOccurrence[] = [];
  const fromDate = new Date(`${from}T12:00:00`);
  const toDate = new Date(`${to}T12:00:00`);

  for (const routine of routines) {
    const weekdays = routine.weekdays?.length ? routine.weekdays : [1, 2, 3, 4, 5, 6, 7];
    const times = routine.times?.length ? routine.times : ["08:00"];

    for (let cursor = new Date(fromDate); cursor <= toDate; cursor = addDays(cursor, 1)) {
      const date = iso(cursor);
      if (!weekdays.includes(getISODay(cursor))) continue;

      for (const time of times) {
        const key = `${routine.id}:${date}:${time}`;
        const prior = existing.get(key);
        if (prior) {
          generated.push(prior);
          continue;
        }

        let assigneeMemberId = routine.assigneeMemberId;
        if (routine.assignMode === "stay") {
          assigneeMemberId =
            custodianOn(snapshot.occurrences, snapshot.travelPlans, routine.childId, date) ??
            assigneeMemberId;
        }

        generated.push({
          id: key,
          routineId: routine.id,
          familyId: snapshot.family.id,
          childId: routine.childId,
          date,
          time,
          assigneeMemberId,
          status: "pending",
          completedAt: null,
          completedByMemberId: null,
          notes: null,
        });
      }
    }
  }

  return generated.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

export function refreshRoutineOccurrences(snapshot: FamilySnapshot, daysBack = 7, daysForward = 30) {
  const from = iso(addDays(new Date(), -daysBack));
  const to = iso(addDays(new Date(), daysForward));
  const manual = snapshot.routineOccurrences.filter(
    (item) => item.status === "done" || item.completedAt,
  );
  const manualKeys = new Set(manual.map((item) => `${item.routineId}:${item.date}:${item.time}`));
  const generated = generateRoutineOccurrences(snapshot, from, to).map((item) => {
    const key = `${item.routineId}:${item.date}:${item.time}`;
    const saved = manual.find((row) => `${row.routineId}:${row.date}:${row.time}` === key);
    return saved ?? item;
  });
  const olderDone = snapshot.routineOccurrences.filter(
    (item) => item.date < from && (item.status === "done" || item.completedAt),
  );
  const newer = generated.filter((item) => !manualKeys.has(`${item.routineId}:${item.date}:${item.time}`) || item.status === "done");
  snapshot.routineOccurrences = [...olderDone, ...newer];
}

export function routineById(snapshot: FamilySnapshot, routineId: string): TaskItem | undefined {
  return snapshot.tasks.find((item) => item.id === routineId);
}
