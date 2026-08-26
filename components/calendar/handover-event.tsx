"use client";

import { ArrowLeftRight } from "lucide-react";
import { childNames, handoverLine } from "@/lib/queries/family-view";
import type { FamilySnapshot, Handover } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function HandoverEvent({
  snapshot,
  handover,
  compact = false,
  onSelect,
  className,
}: {
  snapshot: FamilySnapshot;
  handover: Handover;
  compact?: boolean;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={(click) => {
        click.stopPropagation();
        onSelect?.();
      }}
      onKeyDown={(keydown) => {
        if (!onSelect) return;
        if (keydown.key === "Enter" || keydown.key === " ") {
          keydown.preventDefault();
          keydown.stopPropagation();
          onSelect();
        }
      }}
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-md border border-[color:var(--famli-important)]/35 bg-[color:var(--famli-important)]/10 px-1.5 py-1 text-left",
        onSelect && "cursor-pointer hover:brightness-[0.98]",
        compact ? "text-[10px]" : "text-xs",
        className,
      )}
    >
      <ArrowLeftRight className={cn("shrink-0 text-[color:var(--famli-important)]", compact ? "size-2.5" : "size-3.5")} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">Wissel · {handover.time}</p>
        {!compact ? (
          <>
            <p className="truncate text-[color:var(--famli-muted)]">{handoverLine(snapshot, handover)}</p>
            <p className="truncate text-[color:var(--famli-muted)]">{childNames(snapshot, handover.childIds)}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function HandoverDetail({
  snapshot,
  handover,
}: {
  snapshot: FamilySnapshot;
  handover: Handover;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-[color:var(--famli-important)]/25 bg-[color:var(--famli-important)]/8 p-4">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="size-4 text-[color:var(--famli-important)]" />
        <p className="font-medium">Wissel · {handover.time}</p>
      </div>
      <p className="text-lg">{handoverLine(snapshot, handover)}</p>
      <p className="text-sm text-[color:var(--famli-muted)]">{childNames(snapshot, handover.childIds)}</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-[color:var(--famli-card)] p-3">
          <p className="text-xs text-[color:var(--famli-muted)]">Ophalen</p>
          <p className="font-medium">
            {snapshot.members.find((m) => m.id === (handover.pickupMemberId ?? handover.toMemberId))?.parentLabel ?? "—"}
          </p>
        </div>
        <div className="rounded-xl bg-[color:var(--famli-card)] p-3">
          <p className="text-xs text-[color:var(--famli-muted)]">Locatie</p>
          <p className="font-medium">{handover.location ?? "Nog niet ingevuld"}</p>
        </div>
      </div>
      {handover.packingList.length ? (
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">Meenemen</p>
          <ul className="mt-1 list-disc pl-4 text-sm">
            {handover.packingList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
