"use client";

import { format } from "date-fns";
import { nl } from "date-fns/locale";
import Link from "next/link";
import { timelineForDate } from "@/lib/calendar/timeline";
import { filteredEventsOn, filteredTasksOn, type CalendarFilterState } from "@/lib/calendar/helpers";
import { handoverOn, parentName, pendingChangeForDate } from "@/lib/queries/family-view";
import { taskResponsibilityLine } from "@/lib/queries/responsibility";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";
import { CustodyHeadline } from "@/components/calendar/custody-indicator";
import { HandoverDetail } from "@/components/calendar/handover-event";
import { CalendarEventChip } from "@/components/calendar/calendar-event";
import { AddMenu } from "@/components/compose/add-menu";

export function DayDetailPanel({
  snapshot,
  date,
  filters,
  onEvent,
  onPropose,
}: {
  snapshot: FamilySnapshot;
  date: string;
  filters: CalendarFilterState;
  onEvent: (event: CalendarEvent) => void;
  onPropose: () => void;
}) {
  const handover = handoverOn(snapshot, date);
  const pending = pendingChangeForDate(snapshot, date);
  const timeline = timelineForDate(snapshot, date);
  const dayEvents = filteredEventsOn(snapshot, date, filters).filter((event) => event.category !== "overdracht");
  const tasks = filteredTasksOn(snapshot, date, filters);
  const needed = snapshot.neededItems.filter(
    (item) => item.status !== "gekocht" && item.status !== "niet_meer_nodig" && item.dueOn === date,
  );

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
          Waar zijn ze?
        </h2>
        <div className="mt-2">
          <CustodyHeadline snapshot={snapshot} date={date} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
          Vandaag
        </h2>
        <div className="space-y-2">
          {handover ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                const event = snapshot.events.find((item) => item.id === handover.eventId);
                if (event) onEvent(event);
              }}
              onKeyDown={(keydown) => {
                if (keydown.key === "Enter" || keydown.key === " ") {
                  keydown.preventDefault();
                  const event = snapshot.events.find((item) => item.id === handover.eventId);
                  if (event) onEvent(event);
                }
              }}
              className="cursor-pointer"
            >
              <HandoverDetail snapshot={snapshot} handover={handover} />
            </div>
          ) : null}
          {dayEvents.map((event) => (
            <CalendarEventChip key={event.id} snapshot={snapshot} event={event} date={date} onSelect={onEvent} />
          ))}
          {!dayEvents.length && !handover ? (
            <p className="text-sm text-[color:var(--famli-muted)]">Geen afspraken</p>
          ) : null}
        </div>
      </section>

      {tasks.length ? (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
            Wie doet wat?
          </h2>
          <div className="space-y-2">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/regelen?tab=taken&id=${task.id}`}
                className="block rounded-2xl border border-[color:var(--famli-border)] px-3 py-2.5 hover:bg-[color:var(--famli-bg)]"
              >
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-[color:var(--famli-muted)]">{taskResponsibilityLine(snapshot, task)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {needed.length ? (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
            Nodig
          </h2>
          <div className="space-y-2">
            {needed.map((item) => (
              <Link
                key={item.id}
                href="/regelen?tab=nodig"
                className="block rounded-2xl border border-[color:var(--famli-border)] px-3 py-2.5 hover:bg-[color:var(--famli-bg)]"
              >
                <p className="font-medium">{item.title}</p>
                {item.size ? <p className="text-sm text-[color:var(--famli-muted)]">Maat {item.size}</p> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {pending ? (
        <Link href={`/regelen?tab=verzoeken&id=${pending.id}`} className="block rounded-2xl border border-[color:var(--famli-border)] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">Wijzigingen</p>
          <p className="mt-1">{parentName(snapshot, pending.requestedByMemberId)} heeft gevraagd deze dag te ruilen.</p>
          <span className="mt-3 inline-flex text-sm font-medium text-[color:var(--famli-brand)]">Wijziging bekijken</span>
        </Link>
      ) : null}

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
          Acties
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <AddMenu snapshot={snapshot} compact />
          <Link href="/regelen?tab=taken" className="famli-btn famli-btn-secondary h-10 px-4 text-center">
            Taak
          </Link>
          <button type="button" onClick={onPropose} className="famli-btn famli-btn-secondary h-10 px-4">
            Wijziging voorstellen
          </button>
        </div>
      </section>

      {timeline.length ? (
        <section className="border-t border-[color:var(--famli-border)] pt-4">
          <p className="text-xs text-[color:var(--famli-muted)]">
            {format(new Date(`${date}T12:00:00`), "EEEE d MMMM", { locale: nl })}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[color:var(--famli-muted)]">
            {timeline.map((item) => (
              <li key={item.id}>
                {item.time ? `${item.time} · ` : ""}
                {item.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function dayDetailTitle(date: string) {
  return format(new Date(`${date}T12:00:00`), "EEEE d MMMM", { locale: nl });
}
