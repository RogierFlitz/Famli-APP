"use client";

import { useMemo } from "react";

const WEEKDAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"] as const;

export type ParentOption = {
  memberId: string;
  label: string;
};

export function alternatingCycle(
  length: number,
  parentAId: string,
  parentBId: string,
): string[] {
  return Array.from({ length }, (_, index) =>
    index % 2 === 0 ? parentAId : parentBId,
  );
}

export function defaultWeekdayMemberIds(parentAId: string): string[] {
  return Array(7).fill(parentAId);
}

export function isCustomCycleValid(
  dayCycle: string[],
  parentAId: string,
  parentBId: string,
): boolean {
  if (dayCycle.length < 1) return false;
  const allowed = new Set([parentAId, parentBId]);
  return dayCycle.every((memberId) => allowed.has(memberId));
}

export function isWeekdayAssignmentValid(
  weekdayMemberIds: string[],
  parentAId: string,
  parentBId: string,
): boolean {
  if (weekdayMemberIds.length !== 7) return false;
  const allowed = new Set([parentAId, parentBId]);
  return weekdayMemberIds.every((memberId) => allowed.has(memberId));
}

export function cyclePreview(dayCycle: string[], parents: ParentOption[]): string {
  const labelById = new Map(parents.map((parent) => [parent.memberId, parent.label]));
  return dayCycle
    .map((memberId, index) => `Dag ${index + 1}: ${labelById.get(memberId) ?? "Ouder"}`)
    .join(", ");
}

type CustomCycleEditorProps = {
  dayCycle: string[];
  parents: ParentOption[];
  onChange: (next: string[]) => void;
};

export function CustomCycleEditor({ dayCycle, parents, onChange }: CustomCycleEditorProps) {
  const [parentA, parentB] = parents;
  const preview = useMemo(() => cyclePreview(dayCycle, parents), [dayCycle, parents]);

  if (!parentA || !parentB) return null;

  function toggleDay(index: number) {
    const next = [...dayCycle];
    next[index] =
      next[index] === parentA.memberId ? parentB.memberId : parentA.memberId;
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-black/10 bg-white/60 p-4">
      <div>
        <p className="text-sm font-medium">Herhalende cyclus</p>
        <p className="mt-1 text-xs text-[color:var(--famli-muted)]">
          Tik op een dag om te wisselen tussen {parentA.label} en {parentB.label}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {dayCycle.map((memberId, index) => {
          const isA = memberId === parentA.memberId;
          const label = isA ? parentA.label : parentB.label;
          return (
            <button
              key={`${index}-${memberId}`}
              type="button"
              onClick={() => toggleDay(index)}
              className={`min-w-[4.5rem] rounded-xl border px-3 py-2 text-left text-sm transition ${
                isA
                  ? "border-[color:var(--famli-brand)]/30 bg-[color:var(--famli-brand)]/10"
                  : "border-black/15 bg-black/[0.04]"
              }`}
            >
              <span className="block text-[10px] uppercase tracking-wide text-[color:var(--famli-muted)]">
                Dag {index + 1}
              </span>
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="famli-btn famli-btn-secondary h-9 px-3 text-sm"
          onClick={() => onChange([...dayCycle, parentA.memberId])}
        >
          Dag toevoegen
        </button>
        {dayCycle.length > 1 ? (
          <button
            type="button"
            className="famli-btn famli-btn-secondary h-9 px-3 text-sm"
            onClick={() => onChange(dayCycle.slice(0, -1))}
          >
            Laatste dag verwijderen
          </button>
        ) : null}
        <button
          type="button"
          className="famli-btn famli-btn-secondary h-9 px-3 text-sm"
          onClick={() => onChange(alternatingCycle(7, parentA.memberId, parentB.memberId))}
        >
          7 dagen afwisselend
        </button>
      </div>

      <p className="text-xs text-[color:var(--famli-muted)]">{preview}</p>
    </div>
  );
}

type FixedWeekdaysEditorProps = {
  weekdayMemberIds: string[];
  parents: ParentOption[];
  onChange: (next: string[]) => void;
};

export function FixedWeekdaysEditor({
  weekdayMemberIds,
  parents,
  onChange,
}: FixedWeekdaysEditorProps) {
  const [parentA, parentB] = parents;
  if (!parentA || !parentB) return null;

  function setWeekday(index: number, memberId: string) {
    const next = [...weekdayMemberIds];
    next[index] = memberId;
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-black/10 bg-white/60 p-4">
      <div>
        <p className="text-sm font-medium">Vaste weekdagen</p>
        <p className="mt-1 text-xs text-[color:var(--famli-muted)]">
          Kies per weekdag bij welke ouder het kind is.
        </p>
      </div>

      <div className="space-y-2">
        {WEEKDAY_LABELS.map((label, index) => (
          <label key={label} className="flex items-center justify-between gap-3 text-sm">
            <span className="w-8 font-medium">{label}</span>
            <select
              value={weekdayMemberIds[index] ?? parentA.memberId}
              onChange={(event) => setWeekday(index, event.target.value)}
              className="famli-input flex-1"
            >
              <option value={parentA.memberId}>{parentA.label}</option>
              <option value={parentB.memberId}>{parentB.label}</option>
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
