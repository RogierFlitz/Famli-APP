"use client";

import { useEffect, useState } from "react";
import { addMonths } from "date-fns";
import { toISODate } from "@/lib/dates";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";
import { DEFAULT_FILTERS, type CalendarFilterState } from "@/lib/calendar/helpers";
import { ResponsiveSheet } from "@/components/layout/responsive-sheet";
import { ProposeChangeForm } from "@/components/requests/propose-form";
import { CalendarHeader, type CalendarView } from "@/components/calendar/calendar-header";
import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { CalendarMonth } from "@/components/calendar/calendar-month";
import { CalendarWeek, CalendarDayStrip, CalendarDayTimeline } from "@/components/calendar/calendar-week";
import { WisselsView } from "@/components/calendar/wissels-view";
import { DayDetailPanel, dayDetailTitle } from "@/components/calendar/day-detail-panel";
import { EventDetail } from "@/components/calendar/event-detail";
import { CustodyHeadline } from "@/components/calendar/custody-indicator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return mobile;
}

function resolveInitialView(initialView?: string, mobile = false): CalendarView {
  if (initialView === "week" || initialView === "day" || initialView === "wissels" || initialView === "month") {
    return initialView;
  }
  return mobile ? "week" : "month";
}

export function FamilyCalendar({
  snapshot,
  initialDate,
  initialView,
  focusId,
}: {
  snapshot: FamilySnapshot;
  initialDate?: string;
  initialView?: string;
  focusId?: string;
}) {
  const mobile = useIsMobile();
  const todayIso = toISODate(new Date());
  const [anchor, setAnchor] = useState(() =>
    initialDate ? new Date(`${initialDate}T12:00:00`) : new Date(),
  );
  const [view, setView] = useState<CalendarView>(() => resolveInitialView(initialView, false));
  const [filters, setFilters] = useState<CalendarFilterState>(DEFAULT_FILTERS);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate ?? null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    () => snapshot.events.find((event) => event.id === focusId) ?? null,
  );
  const [proposeOpen, setProposeOpen] = useState(false);

  const [mobileDefaultApplied, setMobileDefaultApplied] = useState(Boolean(initialView));
  if (!initialView && mobile && !mobileDefaultApplied) {
    setMobileDefaultApplied(true);
    setView(resolveInitialView(undefined, mobile));
  }

  const mobileDay = toISODate(anchor);

  const navigatePrev = () => {
    setAnchor((current) => {
      if (view === "month" || view === "wissels") return addMonths(current, -1);
      if (view === "week") return new Date(current.getTime() - 7 * 86400000);
      return new Date(current.getTime() - 86400000);
    });
  };

  const navigateNext = () => {
    setAnchor((current) => {
      if (view === "month" || view === "wissels") return addMonths(current, 1);
      if (view === "week") return new Date(current.getTime() + 7 * 86400000);
      return new Date(current.getTime() + 86400000);
    });
  };

  const goToday = () => {
    const now = new Date();
    setAnchor(now);
    if (view === "day") setSelectedDate(toISODate(now));
  };

  const handleSelectDay = (iso: string) => {
    setSelectedDate(iso);
    setAnchor(new Date(`${iso}T12:00:00`));
  };

  const dayPanelDate = selectedDate ?? mobileDay;

  return (
    <TooltipProvider delayDuration={400}>
      <div className={cn("relative pb-20 md:pb-0", view === "day" && mobile && "pb-24")}>
        <CalendarHeader
          snapshot={snapshot}
          anchor={anchor}
          view={view}
          onViewChange={setView}
          onPrev={navigatePrev}
          onNext={navigateNext}
          onToday={goToday}
        />

        {view !== "wissels" ? <CalendarFilters snapshot={snapshot} filters={filters} onChange={setFilters} /> : null}

        {view === "wissels" ? (
          <WisselsView snapshot={snapshot} onOpen={setSelectedEvent} />
        ) : null}

        {view === "month" && !mobile ? (
          <CalendarMonth
            snapshot={snapshot}
            anchor={anchor}
            filters={filters}
            todayIso={todayIso}
            onSelectDay={handleSelectDay}
            onSelectEvent={setSelectedEvent}
          />
        ) : null}

        {view === "month" && mobile ? (
          <MobileAgenda
            snapshot={snapshot}
            anchor={anchor}
            selectedIso={mobileDay}
            filters={filters}
            todayIso={todayIso}
            onSelectDay={handleSelectDay}
            onSelectEvent={setSelectedEvent}
          />
        ) : null}

        {view === "week" && !mobile ? (
          <CalendarWeek
            snapshot={snapshot}
            anchor={anchor}
            filters={filters}
            todayIso={todayIso}
            onSelectDay={handleSelectDay}
            onSelectEvent={setSelectedEvent}
          />
        ) : null}

        {view === "week" && mobile ? (
          <MobileAgenda
            snapshot={snapshot}
            anchor={anchor}
            selectedIso={mobileDay}
            filters={filters}
            todayIso={todayIso}
            onSelectDay={handleSelectDay}
            onSelectEvent={setSelectedEvent}
          />
        ) : null}

        {view === "day" && !mobile ? (
          <div className="max-w-2xl">
            <div className="mb-4 famli-summary-card">
              <CustodyHeadline snapshot={snapshot} date={toISODate(anchor)} />
            </div>
            <CalendarDayTimeline
              snapshot={snapshot}
              date={toISODate(anchor)}
              filters={filters}
              onSelectEvent={setSelectedEvent}
            />
          </div>
        ) : null}

        {view === "day" && mobile ? (
          <MobileAgenda
            snapshot={snapshot}
            anchor={anchor}
            selectedIso={mobileDay}
            filters={filters}
            todayIso={todayIso}
            onSelectDay={(iso) => setAnchor(new Date(`${iso}T12:00:00`))}
            onSelectEvent={setSelectedEvent}
          />
        ) : null}

        <ResponsiveSheet
          open={Boolean(selectedDate) && !selectedEvent && !proposeOpen}
          onOpenChange={(open) => {
            if (!open) setSelectedDate(null);
          }}
          title={selectedDate ? dayDetailTitle(selectedDate) : "Dag"}
          wide
        >
          {selectedDate ? (
            <DayDetailPanel
              snapshot={snapshot}
              date={selectedDate}
              filters={filters}
              onEvent={setSelectedEvent}
              onPropose={() => setProposeOpen(true)}
            />
          ) : null}
        </ResponsiveSheet>

        <ResponsiveSheet
          open={Boolean(selectedEvent)}
          onOpenChange={() => setSelectedEvent(null)}
          title={selectedEvent?.title ?? "Afspraak"}
          wide
        >
          {selectedEvent ? <EventDetail snapshot={snapshot} event={selectedEvent} /> : null}
        </ResponsiveSheet>

        <ResponsiveSheet open={proposeOpen} onOpenChange={setProposeOpen} title="Wijziging voorstellen">
          {dayPanelDate ? (
            <ProposeChangeForm snapshot={snapshot} date={dayPanelDate} onDone={() => setProposeOpen(false)} />
          ) : null}
        </ResponsiveSheet>
      </div>
    </TooltipProvider>
  );
}

function MobileAgenda({
  snapshot,
  anchor,
  selectedIso,
  filters,
  todayIso,
  onSelectDay,
  onSelectEvent,
}: {
  snapshot: FamilySnapshot;
  anchor: Date;
  selectedIso: string;
  filters: CalendarFilterState;
  todayIso: string;
  onSelectDay: (iso: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  return (
    <div className="space-y-4">
      <CalendarDayStrip anchor={anchor} selectedIso={selectedIso} todayIso={todayIso} onSelect={onSelectDay} />
      <div className="rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] p-4">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--famli-muted)]">
          Waar zijn ze?
        </h2>
        <CustodyHeadline snapshot={snapshot} date={selectedIso} />
      </div>
      <CalendarDayTimeline
        snapshot={snapshot}
        date={selectedIso}
        filters={filters}
        onSelectEvent={onSelectEvent}
      />
    </div>
  );
}
