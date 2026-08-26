"use client";

import { formatTime } from "@/lib/dates";
import { providerBadgeLabel } from "@/lib/calendar/external-events";
import { parentName } from "@/lib/queries/family-view";
import type { FamilySnapshot, PersonalCalendarEvent } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function PersonalEventChip({
  snapshot,
  event,
  compact = false,
  className,
}: {
  snapshot: FamilySnapshot;
  event: PersonalCalendarEvent;
  compact?: boolean;
  className?: string;
}) {
  const time = event.allDay ? null : formatTime(event.startsAt);
  const owner = parentName(snapshot, event.ownerMemberId);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-1 rounded-md border border-dashed border-[color:var(--famli-border)] bg-[color:var(--famli-bg)]/90 px-1 py-0.5 text-left",
        event.isBusyOnly && "opacity-80",
        compact ? "text-[10px] leading-tight" : "text-xs",
        className,
      )}
      title={event.isBusyOnly ? `${owner} · Bezet` : `${owner} · ${event.title}`}
    >
      <ProviderBadge provider={event.provider} compact={compact} />
      <span className="min-w-0 flex-1 truncate">
        {time ? <span className="mr-1 tabular-nums opacity-70">{time}</span> : null}
        {event.isBusyOnly ? "Bezet" : event.title}
      </span>
    </div>
  );
}

function ProviderBadge({
  provider,
  compact,
}: {
  provider: PersonalCalendarEvent["provider"];
  compact?: boolean;
}) {
  const label = providerBadgeLabel(provider);
  const tone =
    provider === "google"
      ? "bg-blue-100 text-blue-800"
      : provider === "microsoft"
        ? "bg-sky-100 text-sky-900"
        : "bg-neutral-200 text-neutral-700";

  return (
    <span
      className={cn(
        "shrink-0 rounded px-1 font-medium uppercase tracking-wide",
        tone,
        compact ? "text-[8px]" : "text-[9px]",
      )}
    >
      {label.slice(0, 3)}
    </span>
  );
}
