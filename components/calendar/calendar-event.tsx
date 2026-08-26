"use client";

import { createElement } from "react";
import {
  ArrowLeftRight,
  Backpack,
  Cake,
  GraduationCap,
  HeartPulse,
  MapPin,
  Palmtree,
  Trophy,
} from "lucide-react";
import { formatTime } from "@/lib/dates";
import { eventKind, handoverLine, handoverOn } from "@/lib/queries/family-view";
import { isImportantEvent, isRoutineEvent } from "@/lib/calendar/helpers";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDesktop } from "@/components/layout/responsive-sheet";
import { cn } from "@/lib/utils";

export function eventIcon(event: CalendarEvent) {
  if (event.category === "overdracht") return ArrowLeftRight;
  if (event.category === "school") return GraduationCap;
  if (event.category === "sport") return /wedstrijd/i.test(event.title) ? Trophy : Backpack;
  if (event.category === "feestje" || event.category === "verjaardag") return Cake;
  if (event.category === "vakantie") return Palmtree;
  if (event.category === "medisch") return HeartPulse;
  if (event.category === "opvang") return MapPin;
  return Backpack;
}

export function eventTone(event: CalendarEvent): string {
  if (event.category === "overdracht") return "border-[color:var(--famli-important)]/30 bg-[color:var(--famli-important)]/10";
  if (event.category === "school" && isRoutineEvent(event)) return "border-[color:var(--famli-school)]/20 bg-[color:var(--famli-school)]/10 text-[color:var(--famli-muted)]";
  if (event.category === "school") return "border-[color:var(--famli-school)]/30 bg-[color:var(--famli-school)]/15";
  if (event.category === "sport") return "border-[color:var(--famli-sport)]/30 bg-[color:var(--famli-sport)]/12";
  if (event.category === "feestje" || event.category === "verjaardag") return "border-[color:var(--famli-child)]/30 bg-[color:var(--famli-child)]/15";
  if (event.category === "vakantie") return "border-[color:var(--famli-parent-2)]/25 bg-[color:var(--famli-parent-2)]/10";
  if (event.category === "medisch") return "border-[color:var(--famli-important)]/25 bg-[color:var(--famli-important)]/8";
  if (event.category === "opvang") return "border-[color:var(--famli-border)] bg-[color:var(--famli-bg)]/80 text-[color:var(--famli-muted)]";
  return "border-[color:var(--famli-border)] bg-white/70";
}

export function CalendarEventChip({
  snapshot,
  event,
  date,
  compact = false,
  onSelect,
  className,
}: {
  snapshot: FamilySnapshot;
  event: CalendarEvent;
  date: string;
  compact?: boolean;
  onSelect: (event: CalendarEvent) => void;
  className?: string;
}) {
  const isHandover = eventKind(event) === "wissel";
  const handover = isHandover ? handoverOn(snapshot, date) : null;
  const routine = isRoutineEvent(event) && !isImportantEvent(event);
  const title = isHandover && handover ? `Wissel · ${handover.time}` : event.title;
  const time = event.allDay ? null : formatTime(event.startsAt);
  const desktop = useDesktop();

  const chip = (
    <div
      role="button"
      tabIndex={0}
      onClick={(click) => {
        click.stopPropagation();
        onSelect(event);
      }}
      onKeyDown={(keydown) => {
        if (keydown.key === "Enter" || keydown.key === " ") {
          keydown.preventDefault();
          keydown.stopPropagation();
          onSelect(event);
        }
      }}
      className={cn(
        "group flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-md border px-1 py-0.5 text-left transition-colors hover:brightness-[0.98]",
        eventTone(event),
        routine && compact && "opacity-70",
        compact ? "text-[10px] leading-tight" : "text-xs",
        className,
      )}
    >
      {createElement(eventIcon(event), {
        className: cn("shrink-0", compact ? "size-2.5" : "size-3"),
        "aria-hidden": true,
      })}
      <span className="min-w-0 flex-1 truncate">
        {time && !isHandover ? <span className="mr-1 tabular-nums opacity-70">{time}</span> : null}
        {title}
      </span>
    </div>
  );

  if (!desktop) return chip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs bg-[color:var(--famli-ink)] text-white">
        <CalendarEventTooltipContent snapshot={snapshot} event={event} date={date} />
      </TooltipContent>
    </Tooltip>
  );
}

export function CalendarEventTooltipContent({
  snapshot,
  event,
  date,
}: {
  snapshot: FamilySnapshot;
  event: CalendarEvent;
  date: string;
}) {
  const handover = event.category === "overdracht" ? handoverOn(snapshot, date) : null;
  return (
    <div className="space-y-1">
      <p className="font-medium">{event.title}</p>
      <p className="opacity-80">
        {event.allDay ? "Hele dag" : formatTime(event.startsAt)}
        {event.location ? ` · ${event.location}` : ""}
      </p>
      {handover ? <p className="opacity-80">{handoverLine(snapshot, handover)}</p> : null}
      {event.packingList.length ? <p className="opacity-70">Meenemen: {event.packingList.join(", ")}</p> : null}
    </div>
  );
}
