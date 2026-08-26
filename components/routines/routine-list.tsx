"use client";

import { formatDayLong } from "@/lib/dates";
import { occurrenceStatusLabel } from "@/lib/queries/routines";
import { parentName } from "@/lib/queries/family-view";
import { completeRoutineOccurrenceAction } from "@/lib/actions/routines";
import { MEDICAL_DISCLAIMER } from "@/lib/members/permissions";
import type { FamilySnapshot, RoutineOccurrence } from "@/lib/domain/types";
import { routineById } from "@/lib/routines/generate";

export function RoutineOccurrenceCard({
  snapshot,
  occurrence,
}: {
  snapshot: FamilySnapshot;
  occurrence: RoutineOccurrence;
}) {
  const routine = routineById(snapshot, occurrence.routineId);
  if (!routine) return null;
  const child = snapshot.children.find((item) => item.id === occurrence.childId);

  return (
    <article className="famli-card" id={occurrence.id}>
      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
        {routine.kind === "care" ? "Zorg" : "Routine"} · {occurrence.time}
      </p>
      <p className="mt-1 text-lg font-medium">
        {routine.kind === "care" ? routine.careLabel ?? routine.title : routine.title}
        {child ? ` · ${child.firstName}` : ""}
      </p>
      <p className="text-sm text-[color:var(--famli-muted)]">
        {formatDayLong(occurrence.date)}
        {occurrence.assigneeMemberId ? ` · ${parentName(snapshot, occurrence.assigneeMemberId)}` : ""}
      </p>
      {routine.packingItems?.length ? (
        <p className="mt-2 text-sm">🎒 {routine.packingItems.join(", ")}</p>
      ) : null}
      {routine.kind === "care" ? (
        <p className="mt-2 text-sm text-[color:var(--famli-muted)]">{MEDICAL_DISCLAIMER}</p>
      ) : null}
      <p className="mt-2 text-sm font-medium">{occurrenceStatusLabel(occurrence.status)}</p>
      {occurrence.status === "pending" ? (
        <form action={completeRoutineOccurrenceAction} className="mt-3">
          <input type="hidden" name="occurrenceId" value={occurrence.id} />
          <button className="famli-btn famli-btn-primary h-11 px-4">Afronden</button>
        </form>
      ) : null}
    </article>
  );
}
