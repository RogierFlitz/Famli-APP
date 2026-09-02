"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { PageHeader } from "@/components/ui/page-header";
import type { FamilySnapshot } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export type CalendarView = "month" | "week" | "day" | "wissels";

export function CalendarHeader({
  snapshot: _snapshot,
  anchor,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}: {
  snapshot: FamilySnapshot;
  anchor: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const monthLabel = format(anchor, "MMMM yyyy", { locale: nl });

  return (
    <div className="mb-6 space-y-4">
      <PageHeader
        title="Agenda"
        subtitle="Wat er speelt, wie brengt of haalt, en waar de kinderen zijn."
        action={
          <button type="button" onClick={onToday} className="famli-btn famli-btn-secondary">
            Vandaag
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Vorige maand"
            onClick={onPrev}
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-[color:var(--famli-bg)]"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="min-w-[9rem] text-center text-lg font-medium capitalize">{monthLabel}</p>
          <button
            type="button"
            aria-label="Volgende maand"
            onClick={onNext}
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-[color:var(--famli-bg)]"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <ViewSwitcher view={view} onViewChange={onViewChange} />
      </div>
    </div>
  );
}

function ViewSwitcher({
  view,
  onViewChange,
}: {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}) {
  const calendarViews: { id: Exclude<CalendarView, "wissels">; label: string }[] = [
    { id: "month", label: "Maand" },
    { id: "week", label: "Week" },
    { id: "day", label: "Dag" },
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-full border border-[color:var(--famli-border)] bg-[color:var(--famli-bg)] p-0.5">
        {calendarViews.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onViewChange(item.id)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-full px-3.5 text-sm leading-none transition-colors",
              view === item.id
                ? "bg-[color:var(--famli-card)] font-medium shadow-sm"
                : "text-[color:var(--famli-muted)] hover:text-[color:var(--famli-ink)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onViewChange("wissels")}
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-full border px-3.5 text-sm leading-none transition-colors",
          view === "wissels"
            ? "border-[color:var(--famli-ink)] bg-[color:var(--famli-ink)] text-white"
            : "border-[color:var(--famli-border)] text-[color:var(--famli-muted)] hover:text-[color:var(--famli-ink)]",
        )}
      >
        Wissels
      </button>
    </div>
  );
}
