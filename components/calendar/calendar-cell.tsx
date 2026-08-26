"use client";

import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toISODate } from "@/lib/dates";
import Link from "next/link";
import {
  custodyBackgroundStyle,
  custodyStateForDate,
  filteredEventsOn,
  filteredTasksOn,
  onlyTasksFilterActive,
  sortEventsForCell,
  type CalendarFilterState,
} from "@/lib/calendar/helpers";
import { personalEventsOn } from "@/lib/calendar/external-events";
import { handoverOn } from "@/lib/queries/family-view";
import { dayCover } from "@/lib/queries/child-life";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";
import { CalendarEventChip } from "@/components/calendar/calendar-event";
import { PersonalEventChip } from "@/components/calendar/personal-event-chip";
import { HandoverEvent } from "@/components/calendar/handover-event";
import { CustodyIndicator } from "@/components/calendar/custody-indicator";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 3;

export function CalendarCell({
  snapshot,
  day,
  anchorMonth,
  filters,
  todayIso,
  onSelectDay,
  onSelectEvent,
}: {
  snapshot: FamilySnapshot;
  day: Date;
  anchorMonth: Date;
  filters: CalendarFilterState;
  todayIso: string;
  onSelectDay: (iso: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const iso = toISODate(day);
  const inMonth = day.getMonth() === anchorMonth.getMonth();
  const isToday = iso === todayIso;
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  const custody = custodyStateForDate(snapshot, iso);
  const handover = handoverOn(snapshot, iso);
  const cover = dayCover(snapshot, iso);

  const dayEvents = sortEventsForCell(
    filteredEventsOn(snapshot, iso, filters).filter((event) => event.category !== "overdracht"),
  );
  const personalEvents = personalEventsOn(snapshot, iso, filters);
  const dayTasks = filteredTasksOn(snapshot, iso, filters);
  const tasksOnly = onlyTasksFilterActive(filters);
  const visible = (tasksOnly ? [] : dayEvents).slice(0, MAX_VISIBLE);
  const visiblePersonal = tasksOnly ? [] : personalEvents.slice(0, Math.max(0, MAX_VISIBLE - visible.length));
  const hiddenCount =
    tasksOnly ? 0 : dayEvents.length - visible.length + Math.max(0, personalEvents.length - visiblePersonal.length);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectDay(iso)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectDay(iso);
        }
      }}
      className={cn(
        "flex min-h-[5.5rem] cursor-pointer flex-col rounded-xl border border-[color:var(--famli-border)] p-1.5 text-left transition-shadow hover:shadow-sm",
        !inMonth && "opacity-40",
        isWeekend && "bg-[color:var(--famli-bg)]/60",
        isToday && "ring-2 ring-[color:var(--famli-brand)]/40 ring-offset-1",
      )}
      style={custodyBackgroundStyle(custody)}
    >
      <div className="mb-1 flex items-start justify-between gap-1">
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
            isToday && "bg-[color:var(--famli-brand)] text-white",
            !isToday && "text-[color:var(--famli-ink)]",
          )}
        >
          {day.getDate()}
        </span>
        <CustodyIndicator snapshot={snapshot} date={iso} compact className="mt-0.5" />
      </div>

      {cover.travel || cover.vacation ? (
        <p className="mb-0.5 truncate text-[9px] text-[color:var(--famli-muted)]">
          {cover.travel?.title ?? cover.vacation?.title}
        </p>
      ) : null}

      <div className="mt-auto space-y-0.5 overflow-hidden">
        {handover ? (
          <HandoverEvent
            snapshot={snapshot}
            handover={handover}
            compact
            onSelect={() => {
              const event = snapshot.events.find((item) => item.id === handover.eventId);
              if (event) onSelectEvent(event);
            }}
          />
        ) : null}
        {visible.map((event) => (
          <CalendarEventChip
            key={event.id}
            snapshot={snapshot}
            event={event}
            date={iso}
            compact
            onSelect={onSelectEvent}
          />
        ))}
        {visiblePersonal.map((event) => (
          <PersonalEventChip key={event.id} snapshot={snapshot} event={event} compact />
        ))}
        {hiddenCount > 0 ? (
          <p className="px-0.5 text-[10px] text-[color:var(--famli-muted)]">+{hiddenCount} meer</p>
        ) : null}
        {dayTasks.slice(0, tasksOnly ? MAX_VISIBLE : 2).map((task) => (
          <Link
            key={task.id}
            href={`/regelen?tab=taken&id=${task.id}`}
            onClick={(event) => event.stopPropagation()}
            className="block truncate rounded-md bg-[color:var(--famli-bg)] px-1 py-0.5 text-[10px] text-[color:var(--famli-ink)] hover:bg-[color:var(--famli-brand-soft)]"
          >
            ✓ {task.title}
          </Link>
        ))}
        {tasksOnly && dayTasks.length > MAX_VISIBLE ? (
          <p className="px-0.5 text-[10px] text-[color:var(--famli-muted)]">+{dayTasks.length - MAX_VISIBLE} taken</p>
        ) : null}
      </div>
    </div>
  );
}

export function CalendarWeekdayHeader() {
  return (
    <div className="mb-1 grid grid-cols-7 gap-1">
      {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((label) => (
        <div key={label} className="px-1 py-1 text-center text-[11px] font-medium text-[color:var(--famli-muted)]">
          {label}
        </div>
      ))}
    </div>
  );
}

export function formatMonthTitle(date: Date) {
  return format(date, "MMMM yyyy", { locale: nl });
}
