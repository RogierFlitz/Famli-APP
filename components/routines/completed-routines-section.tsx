"use client";

import { formatDayLong } from "@/lib/dates";
import { occurrenceStatusLabel } from "@/lib/queries/routines";
import { parentName } from "@/lib/queries/family-view";
import { routineById } from "@/lib/routines/generate";
import type { FamilySnapshot, RoutineOccurrence } from "@/lib/domain/types";
import { CollapsibleSection, ExpandableList } from "@/components/ui/collapsible-section";

function CompletedOccurrenceCard({
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
    <article className="famli-card opacity-80" id={occurrence.id}>
      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
        {routine.kind === "care" ? "Zorg" : "Routine"} · {occurrence.time}
      </p>
      <p className="mt-1 text-lg font-medium line-through">
        {routine.kind === "care" ? routine.careLabel ?? routine.title : routine.title}
        {child ? ` · ${child.firstName}` : ""}
      </p>
      <p className="text-sm text-[color:var(--famli-muted)]">
        {formatDayLong(occurrence.date)}
        {occurrence.assigneeMemberId ? ` · ${parentName(snapshot, occurrence.assigneeMemberId)}` : ""}
        {occurrence.completedAt ? ` · ✓ ${formatDayLong(occurrence.completedAt)}` : ""}
      </p>
      <p className="mt-1 text-sm font-medium text-[color:var(--famli-muted)]">{occurrenceStatusLabel(occurrence.status)}</p>
    </article>
  );
}

export function CompletedRoutineOccurrencesSection({
  snapshot,
  occurrences,
  groupByDate = false,
}: {
  snapshot: FamilySnapshot;
  occurrences: RoutineOccurrence[];
  groupByDate?: boolean;
}) {
  if (!occurrences.length) return null;

  if (groupByDate) {
    const byDate = new Map<string, RoutineOccurrence[]>();
    for (const item of occurrences) {
      const list = byDate.get(item.date) ?? [];
      list.push(item);
      byDate.set(item.date, list);
    }
    const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

    return (
      <CollapsibleSection title="Afgerond" count={occurrences.length}>
        <div className="space-y-4">
          {dates.map((date) => (
            <div key={date}>
              <p className="mb-2 text-sm font-medium text-[color:var(--famli-muted)]">{formatDayLong(date)}</p>
              <div className="space-y-2">
                {(byDate.get(date) ?? []).map((occurrence) => (
                  <CompletedOccurrenceCard key={occurrence.id} snapshot={snapshot} occurrence={occurrence} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="Afgerond" count={occurrences.length}>
      <ExpandableList
        items={occurrences}
        initialLimit={20}
        renderItem={(occurrence) => (
          <CompletedOccurrenceCard key={occurrence.id} snapshot={snapshot} occurrence={occurrence} />
        )}
      />
    </CollapsibleSection>
  );
}
