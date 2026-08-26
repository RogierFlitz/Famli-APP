"use client";

import { parentName } from "@/lib/queries/family-view";
import { custodyStateForDate, parentMembers, type CustodyState } from "@/lib/calendar/helpers";
import type { FamilySnapshot } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function CustodyLegend({ snapshot }: { snapshot: FamilySnapshot }) {
  const parents = parentMembers(snapshot);
  if (!parents.length) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[color:var(--famli-muted)]">
      {parents.map((member) => (
        <span key={member.id} className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: member.displayColor }} aria-hidden />
          {parentName(snapshot, member.id)}
        </span>
      ))}
    </div>
  );
}

export function CustodyIndicator({
  snapshot,
  date,
  compact = false,
  className,
}: {
  snapshot: FamilySnapshot;
  date: string;
  compact?: boolean;
  className?: string;
}) {
  const state = custodyStateForDate(snapshot, date);
  if (state.kind === "none") return null;

  if (state.kind === "split") {
    return (
      <div className={cn("flex items-center gap-0.5", className)} title={splitTitle(state)}>
        {state.assignments.map((item) => (
          <span
            key={item.childId}
            className={cn("rounded-full", compact ? "size-1.5" : "size-2")}
            style={{ backgroundColor: item.color }}
            aria-label={`${item.childName} bij ${item.memberName}`}
          />
        ))}
      </div>
    );
  }

  return (
    <span
      className={cn("rounded-full", compact ? "size-1.5" : "size-2", className)}
      style={{ backgroundColor: state.color }}
      title={`Bij ${state.memberName.toLowerCase()}`}
      aria-hidden
    />
  );
}

function splitTitle(state: Extract<CustodyState, { kind: "split" }>) {
  return state.assignments.map((item) => `${item.childName}: ${item.memberName}`).join(" · ");
}

export function CustodyHeadline({
  snapshot,
  date,
}: {
  snapshot: FamilySnapshot;
  date: string;
}) {
  const state = custodyStateForDate(snapshot, date);

  if (state.kind === "none") {
    return <p className="text-sm text-[color:var(--famli-muted)]">Nog niet ingepland</p>;
  }

  if (state.kind === "single") {
    return (
      <p className="text-sm">
        {snapshot.children.map((c) => c.firstName).join(" & ")} bij{" "}
        <span className="font-medium">{state.memberName.toLowerCase()}</span>
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-sm">
      {state.assignments.map((item) => (
        <li key={item.childId} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
          <span>
            <span className="font-medium">{item.childName}</span> bij {item.memberName.toLowerCase()}
          </span>
        </li>
      ))}
    </ul>
  );
}
