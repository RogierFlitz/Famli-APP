"use client";

import { monthGrid } from "@/lib/dates";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";
import type { CalendarFilterState } from "@/lib/calendar/helpers";
import { CalendarCell, CalendarWeekdayHeader } from "@/components/calendar/calendar-cell";
import { CustodyLegend } from "@/components/calendar/custody-indicator";

export function CalendarMonth({
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
  const days = monthGrid(anchor);

  return (
    <div>
      <CustodyLegend snapshot={snapshot} />
      <CalendarWeekdayHeader />
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <CalendarCell
            key={day.toISOString()}
            snapshot={snapshot}
            day={day}
            anchorMonth={anchor}
            filters={filters}
            todayIso={todayIso}
            onSelectDay={onSelectDay}
            onSelectEvent={onSelectEvent}
          />
        ))}
      </div>
    </div>
  );
}
