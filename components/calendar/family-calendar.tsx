"use client";

import { useMemo, useState } from "react";
import { addMonths, format } from "date-fns";
import { nl } from "date-fns/locale";
import Link from "next/link";
import { monthGrid, toISODate, weekDays, formatTime } from "@/lib/dates";
import {
  childNames,
  eventKind,
  eventsOn,
  handoverLine,
  handoverOn,
  memberColor,
  occurrenceOn,
  parentName,
  pendingChangeForDate,
  upcomingHandovers,
  overnightMemberId,
} from "@/lib/queries/family-view";
import { dayCover } from "@/lib/queries/child-life";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";
import { ResponsiveSheet } from "@/components/layout/responsive-sheet";
import { ProposeChangeForm } from "@/components/requests/propose-form";
import { AddMenu } from "@/components/compose/add-menu";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

type View = "month" | "week" | "day" | "wissels";

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
  const [anchor, setAnchor] = useState(() => (initialDate ? new Date(`${initialDate}T12:00:00`) : new Date()));
  const [view, setView] = useState<View>(
    initialView === "week" || initialView === "day" || initialView === "wissels" ? initialView : "month",
  );
  const [filter, setFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate ?? null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    () => snapshot.events.find((event) => event.id === focusId) ?? null,
  );
  const [proposeOpen, setProposeOpen] = useState(false);

  const days = useMemo(() => {
    if (view === "month") return monthGrid(anchor);
    if (view === "week") return weekDays(anchor);
    return [anchor];
  }, [anchor, view]);

  const filters = [
    { id: "all", label: "Alles" },
    ...snapshot.children.map((child) => ({ id: child.id, label: child.firstName })),
    ...snapshot.members.map((member) => ({ id: member.id, label: parentName(snapshot, member.id) })),
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1 text-[color:var(--famli-muted)]">{format(anchor, "MMMM yyyy", { locale: nl })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["month", "week", "day", "wissels"] as View[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={cn(
                "h-11 rounded-full px-4 text-sm",
                view === item
                  ? "bg-[color:var(--famli-ink)] text-white"
                  : "border border-[color:var(--famli-border)]",
              )}
            >
              {item === "month" ? "Maand" : item === "week" ? "Week" : item === "day" ? "Dag" : "Wissels"}
            </button>
          ))}
          <button
            type="button"
            className="h-11 rounded-full border border-[color:var(--famli-border)] px-4 text-sm"
            onClick={() => setAnchor(new Date())}
          >
            Vandaag
          </button>
          <AddMenu snapshot={snapshot} compact />
        </div>
      </div>

      {view !== "wissels" ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "h-9 rounded-full px-3 text-sm",
                filter === item.id
                  ? "bg-[color:var(--famli-brand-soft)] text-[color:var(--famli-ink)]"
                  : "text-[color:var(--famli-muted)]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {view === "wissels" ? (
        <HandoverView snapshot={snapshot} onOpen={(event) => setSelectedEvent(event)} />
      ) : null}

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-1">
          {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((label) => (
            <div key={label} className="px-1 pb-2 text-center text-xs text-[color:var(--famli-muted)]">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const iso = toISODate(day);
            const occ = occurrenceOn(snapshot, iso);
            const color = memberColor(snapshot, occ?.custodianMemberId);
            const dayEvents = eventsOn(snapshot, iso, filter);
            const cover = dayCover(snapshot, iso);
            return (
              <div
                key={iso}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDate(iso)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDate(iso);
                  }
                }}
                className="min-h-24 cursor-pointer rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] p-2 text-left"
                style={{ background: color ? `${color}12` : undefined }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{day.getDate()}</span>
                  {occ ? (
                    <span className="text-[10px] text-[color:var(--famli-muted)]">
                      Bij {parentName(snapshot, occ.custodianMemberId).toLowerCase()}
                    </span>
                  ) : null}
                </div>
                {cover.vacation || cover.travel ? (
                  <p className="mt-1 truncate text-[10px] text-[color:var(--famli-muted)]">
                    {cover.travel?.title ?? cover.vacation?.title}
                  </p>
                ) : null}
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(click) => {
                        click.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className={cn(
                        "block w-full truncate rounded-md px-1 py-0.5 text-left text-[11px]",
                        eventKind(event) === "wissel"
                          ? "bg-white/80 text-[color:var(--famli-ink)]"
                          : "bg-white/60",
                      )}
                    >
                      {event.category === "overdracht"
                        ? (handoverOn(snapshot, iso)
                            ? handoverLine(snapshot, handoverOn(snapshot, iso)!)
                            : "Wisselmoment")
                        : event.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {view === "week" || view === "day" ? (
        <div className={view === "week" ? "grid gap-3 md:grid-cols-7" : "space-y-3"}>
          {days.map((day) => {
            const iso = toISODate(day);
            const occ = occurrenceOn(snapshot, iso);
            const dayEvents = eventsOn(snapshot, iso, filter);
            return (
              <section key={iso} className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] p-4">
                <button type="button" className="mb-3 flex w-full items-center justify-between text-left" onClick={() => setSelectedDate(iso)}>
                  <h2 className="font-medium">{format(day, "EEE d MMM", { locale: nl })}</h2>
                  {occ ? (
                    <span className="text-xs text-[color:var(--famli-muted)]">
                      Bij {parentName(snapshot, occ.custodianMemberId).toLowerCase()}
                    </span>
                  ) : null}
                </button>
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="w-full rounded-2xl bg-[color:var(--famli-bg)] px-3 py-2 text-left"
                    >
                      <p className="text-xs text-[color:var(--famli-muted)]">
                        {event.allDay ? "Hele dag" : formatTime(event.startsAt)}
                      </p>
                      <p className="font-medium">{event.title}</p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(iso);
                      setProposeOpen(true);
                    }}
                    className="w-full rounded-2xl border border-dashed border-[color:var(--famli-border)] py-2 text-sm text-[color:var(--famli-muted)]"
                  >
                    Wijziging voorstellen
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {view !== "month" ? (
        <div className="mt-6 flex justify-between">
          <button
            type="button"
            className="h-11 rounded-full border border-[color:var(--famli-border)] px-4"
            onClick={() =>
              setAnchor((current) =>
                view === "wissels"
                  ? current
                  : new Date(current.getTime() - (view === "week" ? 7 : 1) * 86400000),
              )
            }
          >
            Vorige
          </button>
          <button
            type="button"
            className="h-11 rounded-full border border-[color:var(--famli-border)] px-4"
            onClick={() =>
              setAnchor((current) =>
                view === "wissels"
                  ? addMonths(current, 1)
                  : new Date(current.getTime() + (view === "week" ? 7 : 1) * 86400000),
              )
            }
          >
            Volgende
          </button>
        </div>
      ) : (
        <div className="mt-6 flex justify-between">
          <button type="button" className="h-11 rounded-full border border-[color:var(--famli-border)] px-4" onClick={() => setAnchor((current) => addMonths(current, -1))}>
            Vorige
          </button>
          <button type="button" className="h-11 rounded-full border border-[color:var(--famli-border)] px-4" onClick={() => setAnchor((current) => addMonths(current, 1))}>
            Volgende
          </button>
        </div>
      )}

      <ResponsiveSheet
        open={Boolean(selectedDate) && !selectedEvent && !proposeOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null);
        }}
        title={selectedDate ? format(new Date(`${selectedDate}T12:00:00`), "EEEE d MMMM", { locale: nl }) : "Dag"}
      >
        {selectedDate ? (
          <DayPanel
            snapshot={snapshot}
            date={selectedDate}
            filter={filter}
            onEvent={setSelectedEvent}
            onPropose={() => setProposeOpen(true)}
          />
        ) : null}
      </ResponsiveSheet>

      <ResponsiveSheet open={Boolean(selectedEvent)} onOpenChange={() => setSelectedEvent(null)} title={selectedEvent?.title ?? "Afspraak"}>
        {selectedEvent ? <EventDetail snapshot={snapshot} event={selectedEvent} /> : null}
      </ResponsiveSheet>

      <ResponsiveSheet open={proposeOpen} onOpenChange={setProposeOpen} title="Wijziging voorstellen">
        {selectedDate ? (
          <ProposeChangeForm snapshot={snapshot} date={selectedDate} onDone={() => setProposeOpen(false)} />
        ) : null}
      </ResponsiveSheet>
    </div>
  );
}

function DayPanel({
  snapshot,
  date,
  filter,
  onEvent,
  onPropose,
}: {
  snapshot: FamilySnapshot;
  date: string;
  filter: string;
  onEvent: (event: CalendarEvent) => void;
  onPropose: () => void;
}) {
  const occ = occurrenceOn(snapshot, date);
  const handover = handoverOn(snapshot, date);
  const pending = pendingChangeForDate(snapshot, date);
  const dayEvents = eventsOn(snapshot, date, filter).filter((event) => event.category !== "overdracht");

  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">Verblijf</p>
        <p className="mt-1 text-lg font-medium">
          {occ ? `Bij ${parentName(snapshot, occ.custodianMemberId).toLowerCase()}` : "Nog niet ingepland"}
        </p>
      </section>
      <section className="space-y-2">
        {dayEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onEvent(event)}
            className="w-full rounded-2xl bg-[color:var(--famli-bg)] px-3 py-3 text-left"
          >
            <p className="text-xs text-[color:var(--famli-muted)]">{event.allDay ? "Hele dag" : formatTime(event.startsAt)}</p>
            <p className="font-medium">{event.title}</p>
            <p className="text-sm text-[color:var(--famli-muted)]">{event.location ?? childNames(snapshot, event.childIds)}</p>
          </button>
        ))}
        {handover ? (
          <button
            type="button"
            onClick={() => {
              const event = snapshot.events.find((item) => item.id === handover.eventId);
              if (event) onEvent(event);
            }}
            className="w-full rounded-2xl bg-[color:var(--famli-bg)] px-3 py-3 text-left"
          >
            <p className="text-xs text-[color:var(--famli-muted)]">{handover.time}</p>
            <p className="font-medium">Wisselmoment</p>
            <p className="text-sm text-[color:var(--famli-muted)]">{handoverLine(snapshot, handover)}</p>
          </button>
        ) : null}
      </section>
      {pending ? (
        <Link href={`/regelen?tab=verzoeken&id=${pending.id}`} className="block rounded-2xl border border-[color:var(--famli-border)] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">Wijzigingen</p>
          <p className="mt-1">{parentName(snapshot, pending.requestedByMemberId)} heeft gevraagd deze dag te ruilen.</p>
          <span className="mt-3 inline-flex text-sm font-medium text-[color:var(--famli-brand)]">Wijziging bekijken</span>
        </Link>
      ) : null}
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onPropose} className="famli-btn famli-btn-secondary w-full">
          Wijziging voorstellen
        </button>
      </div>
    </div>
  );
}

function EventDetail({ snapshot, event }: { snapshot: FamilySnapshot; event: CalendarEvent }) {
  const handover = snapshot.handovers.find((item) => item.id === event.handoverId);
  const party = snapshot.parties.find((item) => item.eventId === event.id);
  const gift = party?.giftNeededItemId
    ? snapshot.neededItems.find((item) => item.id === party.giftNeededItemId)
    : snapshot.neededItems.find((item) => item.eventId === event.id && item.category === "cadeau");
  const date = event.startsAt.slice(0, 10);
  const night = overnightMemberId(snapshot, date);
  const child = snapshot.children.find((item) => event.childIds.includes(item.id));
  const travel = snapshot.travelPlans.find((plan) => plan.title === event.title);

  return (
    <div className="space-y-3 text-sm">
      <p className="text-[color:var(--famli-muted)]">
        {event.allDay ? "Hele dag" : formatTime(event.startsAt)}
        {event.endsAt && !event.allDay ? `–${formatTime(event.endsAt)}` : ""}
        {event.location ? ` · ${event.location}` : ""}
      </p>
      {handover ? (
        <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4">
          <p className="font-medium">{handoverLine(snapshot, handover)}</p>
          <p className="mt-1">Wie haalt: {parentName(snapshot, handover.pickupMemberId ?? handover.toMemberId)}</p>
          {handover.packingList.length ? (
            <ul className="mt-2 list-disc pl-4 text-[color:var(--famli-muted)]">
              {handover.packingList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {event.schoolKind === "studiedag" ? (
        <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4">
          <p className="font-medium">Geen school.</p>
          <p className="mt-2">Wie is bij {child?.firstName ?? "dit kind"}?</p>
          <p className="text-lg font-semibold">{night ? parentName(snapshot, night) : "Nog niet geregeld"}</p>
          <Link href={`/regelen?tab=taken`} className="mt-3 inline-flex text-sm font-medium text-[color:var(--famli-brand)]">
            Regelen
          </Link>
        </div>
      ) : null}
      {event.dropoffMemberId || event.pickupMemberId ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[color:var(--famli-bg)] p-3">
            <p className="text-xs text-[color:var(--famli-muted)]">Brengen</p>
            <p className="font-medium">{event.dropoffMemberId ? parentName(snapshot, event.dropoffMemberId) : "—"}</p>
          </div>
          <div className="rounded-2xl bg-[color:var(--famli-bg)] p-3">
            <p className="text-xs text-[color:var(--famli-muted)]">Halen</p>
            <p className="font-medium">{event.pickupMemberId ? parentName(snapshot, event.pickupMemberId) : "—"}</p>
          </div>
        </div>
      ) : null}
      {party ? (
        <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4">
          <p>Voor {snapshot.children.find((item) => item.id === party.forChildId)?.firstName}</p>
          {party.address ? (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(party.address)}`}
              className="mt-1 block font-medium text-[color:var(--famli-brand)]"
              target="_blank"
              rel="noreferrer"
            >
              {party.address}
            </a>
          ) : null}
          <p className="mt-2">RSVP: {party.rsvp === "accepted" ? "Bevestigd" : party.rsvp === "declined" ? "Afgezegd" : "Nog open"}</p>
          <p>
            Cadeau: {gift?.status === "gekocht" ? `Gekocht door ${gift.purchasedByMemberId ? parentName(snapshot, gift.purchasedByMemberId) : "een ouder"}` : "Nog regelen"}
          </p>
          {party.giftBudgetCents ? <p>Budget cadeau: €{(party.giftBudgetCents / 100).toFixed(0)}</p> : null}
          {party.contact ? <p className="text-[color:var(--famli-muted)]">{party.contact}</p> : null}
          {party.notes ? <p className="mt-1">{party.notes}</p> : null}
          {gift && gift.status !== "gekocht" ? (
            <Link href={`/kinderen/${party.forChildId}?tab=nodig`} className="mt-3 inline-flex font-medium text-[color:var(--famli-brand)]">
              Cadeau toevoegen
            </Link>
          ) : null}
        </div>
      ) : null}
      {travel ? (
        <Link href={`/kinderen/${travel.childIds[0]}?tab=reizen`} className="inline-flex font-medium text-[color:var(--famli-brand)]">
          Bekijk reisgegevens
        </Link>
      ) : null}
      {event.packingList.length ? <p>🎒 {event.packingList.join(", ")}</p> : null}
      {event.childIds.length ? <p>{childNames(snapshot, event.childIds)}</p> : null}
      <div className="flex flex-wrap gap-2 pt-2">
        <Link href={`/kinderen/${event.childIds[0] ?? snapshot.children[0]?.id}`} className="famli-btn famli-btn-secondary h-10 px-4">
          Kinderprofiel
        </Link>
        {handover ? (
          <Link href={`/agenda?date=${handover.date}&view=wissels`} className="famli-btn famli-btn-secondary h-10 px-4">
            Wisseldagen
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function HandoverView({
  snapshot,
  onOpen,
}: {
  snapshot: FamilySnapshot;
  onOpen: (event: CalendarEvent) => void;
}) {
  const today = toISODate(new Date());
  const next = upcomingHandovers(snapshot, today, 6);
  const first = next[0];
  if (!first) {
    return <EmptyState title="Nog geen wissels gepland" body="Wisselmomenten verschijnen hier zodra het verblijfsschema loopt." />;
  }
  const event = snapshot.events.find((item) => item.id === first.eventId);
  return (
    <div className="space-y-6">
      <section className="famli-card">
        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">Volgende wissel</p>
        <h2 className="mt-2 text-2xl font-semibold">
          {format(new Date(`${first.date}T12:00:00`), "EEEE d MMMM", { locale: nl })} · {first.time}
        </h2>
        <p className="mt-2 text-lg">{handoverLine(snapshot, first)}</p>
        <p className="mt-3 text-sm text-[color:var(--famli-muted)]">Locatie: {first.location ?? "Nog niet ingevuld"}</p>
        <p className="text-sm text-[color:var(--famli-muted)]">
          Wie haalt: {parentName(snapshot, first.pickupMemberId ?? first.toMemberId)}
        </p>
        {first.packingList.length ? (
          <ul className="mt-3 list-disc pl-5 text-sm">
            {first.packingList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="famli-btn famli-btn-secondary mt-4 h-11 px-4"
          onClick={() => event && onOpen(event)}
        >
          Wijzigen
        </button>
      </section>
      <section>
        <h3 className="mb-3 text-xl font-semibold">Komende wissels</h3>
        <div className="space-y-2">
          {next.slice(1).map((item) => {
            const linked = snapshot.events.find((eventItem) => eventItem.id === item.eventId);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => linked && onOpen(linked)}
                className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-sm text-[color:var(--famli-muted)]">
                    {format(new Date(`${item.date}T12:00:00`), "EEE d MMM", { locale: nl })} · {item.time}
                  </span>
                  <span className="font-medium">{handoverLine(snapshot, item)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
