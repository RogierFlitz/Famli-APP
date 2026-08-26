"use client";

import { useTransition } from "react";
import { formatDayLong } from "@/lib/dates";
import { occurrenceStatusLabel } from "@/lib/queries/routines";
import { parentName } from "@/lib/queries/family-view";
import { completeRoutineOccurrenceAction, reopenRoutineOccurrenceAction } from "@/lib/actions/routines";
import { MEDICAL_DISCLAIMER } from "@/lib/members/permissions";
import type { FamilySnapshot, RoutineOccurrence } from "@/lib/domain/types";
import { routineById } from "@/lib/routines/generate";
import { Checkbox } from "@/components/ui/checkbox";
import { showCompletionUndoToast } from "@/components/completion/undo-toast";
import { ReopenButton } from "@/components/completion/reopen-button";
import { toast } from "sonner";

export function RoutineOccurrenceCard({
  snapshot,
  occurrence,
}: {
  snapshot: FamilySnapshot;
  occurrence: RoutineOccurrence;
}) {
  const [pending, startTransition] = useTransition();
  const routine = routineById(snapshot, occurrence.routineId);
  if (!routine) return null;
  const child = snapshot.children.find((item) => item.id === occurrence.childId);
  const isDone = occurrence.status === "done";
  const title =
    routine.kind === "care" ? routine.careLabel ?? routine.title : routine.title;

  function toggle(nextChecked: boolean) {
    startTransition(async () => {
      try {
        if (nextChecked) {
          const formData = new FormData();
          formData.set("occurrenceId", occurrence.id);
          await completeRoutineOccurrenceAction(formData);
          showCompletionUndoToast("Afgerond", () => reopenRoutineOccurrenceAction(occurrence.id));
        } else {
          await reopenRoutineOccurrenceAction(occurrence.id);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Actie mislukt");
      }
    });
  }

  return (
    <article className="famli-card" id={occurrence.id}>
      <div className="flex items-start gap-3">
        {occurrence.status === "pending" || isDone ? (
          <Checkbox
            checked={isDone}
            disabled={pending || occurrence.status === "unregistered"}
            onCheckedChange={(value) => toggle(value === true)}
            aria-label={`${title} afgerond`}
            className="mt-1 size-5 shrink-0 rounded-md"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
            {routine.kind === "care" ? "Zorg" : "Routine"} · {occurrence.time}
          </p>
          <p className={`mt-1 text-lg font-medium ${isDone ? "line-through opacity-80" : ""}`}>
            {title}
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
        </div>
        {isDone ? <ReopenButton compact onReopen={() => reopenRoutineOccurrenceAction(occurrence.id)} /> : null}
      </div>
    </article>
  );
}
