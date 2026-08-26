"use client";

import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toISODate, weekDays } from "@/lib/dates";
import { filteredEventsOn, filteredTasksOn, custodyBackgroundStyle, custodyStateForDate } from "@/lib/calendar/helpers";
import { handoverOn } from "@/lib/queries/family-view";
import Link from "next/link";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";
import type { CalendarFilterState } from "@/lib/calendar/helpers";
import { CalendarEventChip } from "@/components/calendar/calendar-event";
import { HandoverEvent } from "@/components/calendar/handover-event";
import { CustodyHeadline } from "@/components/calendar/custody-indicator";
import { cn } from "@/lib/utils";

export function CalendarWeek({
  snapshot,
  anchor,
  filters,
  todayIso,
  onSelectDay,
  onSelectEvent,
}: {
  snapshot: FamilySnapshot;
  anchor: Date;
  filters: CalendarFilterState;
  todayIso: string;
  onSelectDay: (iso: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const days = weekDays(anchor);

  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((day) => {
        const iso = toISODate(day);
        const isToday = iso === todayIso;
        const custody = custodyStateForDate(snapshot, iso);
        const handover = handoverOn(snapshot, iso);
        const dayEvents = filteredEventsOn(snapshot, iso, filters).filter((event) => event.category !== "overdracht");
        const dayTasks = filteredTasksOn(snapshot, iso, filters);

        return (
          <section
            key={iso}
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
              "cursor-pointer rounded-2xl border border-[color:var(--famli-border)] p-3 transition-shadow hover:shadow-sm",
              isToday && "ring-2 ring-[color:var(--famli-brand)]/35",
            )}
            style={custodyBackgroundStyle(custody)}
          >
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium capitalize">{format(day, "EEE d", { locale: nl })}</h2>
              {isToday ? (
                <span className="rounded-full bg-[color:var(--famli-brand)] px-2 py-0.5 text-[10px] text-white">
                  Vandaag
                </span>
              ) : null}
            </div>
            <div className="mb-3 text-xs text-[color:var(--famli-muted)]">
              <CustodyHeadline snapshot={snapshot} date={iso} />
            </div>
            <div className="space-y-1.5">
              {handover ? (
                <HandoverEvent
                  snapshot={snapshot}
                  handover={handover}
                  onSelect={() => {
                    const event = snapshot.events.find((item) => item.id === handover.eventId);
                    if (event) onSelectEvent(event);
                  }}
                />
              ) : null}
              {dayEvents.map((event) => (
                <CalendarEventChip
                  key={event.id}
                  snapshot={snapshot}
                  event={event}
                  date={iso}
                  onSelect={onSelectEvent}
                />
              ))}
              {dayTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/regelen?tab=taken&id=${task.id}`}
                  className="block rounded-xl border border-[color:var(--famli-border)] px-2 py-1.5 text-xs hover:bg-[color:var(--famli-bg)]"
                >
                  <span className="font-medium">{task.title}</span>
                  <span className="ml-1 text-[color:var(--famli-muted)]">· Taak</span>
                </Link>
              ))}
              {!dayEvents.length && !dayTasks.length && !handover ? (
                <p className="text-xs text-[color:var(--famli-muted)]">Geen afspraken</p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function CalendarDayStrip({
  anchor,
  selectedIso,
  todayIso,
  onSelect,
}: {
  anchor: Date;
  selectedIso: string;
  todayIso: string;
  onSelect: (iso: string) => void;
}) {
  const days = weekDays(anchor);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {days.map((day) => {
        const iso = toISODate(day);
        const selected = iso === selectedIso;
        const isToday = iso === todayIso;
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            className={cn(
              "min-w-[3.25rem] shrink-0 rounded-2xl border px-2 py-2 text-center transition-colors",
              selected
                ? "border-[color:var(--famli-brand)] bg-[color:var(--famli-brand-soft)]"
                : "border-[color:var(--famli-border)] bg-[color:var(--famli-card)]",
            )}
          >
            <span className="block text-[10px] uppercase text-[color:var(--famli-muted)]">
              {format(day, "EEE", { locale: nl })}
            </span>
            <span
              className={cn(
                "mx-auto mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-sm font-medium",
                isToday && !selected && "ring-1 ring-[color:var(--famli-brand)]",
              )}
            >
              {day.getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CalendarDayTimeline({
  snapshot,
  date,
  filters,
  onSelectEvent,
}: {
  snapshot: FamilySnapshot;
  date: string;
  filters: CalendarFilterState;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const handover = handoverOn(snapshot, date);
  const dayEvents = filteredEventsOn(snapshot, date, filters).filter((event) => event.category !== "overdracht");
  const dayTasks = filteredTasksOn(snapshot, date, filters);

  return (
    <div className="space-y-2">
      {handover ? (
        <HandoverEvent
          snapshot={snapshot}
          handover={handover}
          onSelect={() => {
            const event = snapshot.events.find((item) => item.id === handover.eventId);
            if (event) onSelectEvent(event);
          }}
        />
      ) : null}
      {dayEvents.map((event) => (
        <CalendarEventChip
          key={event.id}
          snapshot={snapshot}
          event={event}
          date={date}
          onSelect={onSelectEvent}
        />
      ))}
      {dayTasks.map((task) => (
        <Link
          key={task.id}
          href={`/regelen?tab=taken&id=${task.id}`}
          className="block rounded-2xl border border-[color:var(--famli-border)] px-3 py-2 hover:bg-[color:var(--famli-bg)]"
        >
          <p className="font-medium">{task.title}</p>
          <p className="text-xs text-[color:var(--famli-muted)]">Taak</p>
        </Link>
      ))}
      {!dayEvents.length && !dayTasks.length && !handover ? (
        <p className="py-6 text-center text-sm text-[color:var(--famli-muted)]">Geen afspraken vandaag</p>
      ) : null}
    </div>
  );
}
