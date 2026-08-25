"use client";

import { useMemo, useState } from "react";
import { addMonths, format } from "date-fns";
import { nl } from "date-fns/locale";
import { monthGrid, toISODate, weekDays, formatTime } from "@/lib/dates";
import { memberLabel } from "@/lib/custody/generate";
import { eventCategoryLabel, eventCategoryTone, changeRequestLabel } from "@/lib/domain/labels";
import type { CalendarEvent, FamilySnapshot, Handover } from "@/lib/domain/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createChangeRequestAction, createEventAction } from "@/lib/actions/calendar";
import Link from "next/link";

type View = "month" | "week" | "day";

export function FamilyCalendar({ snapshot }: { snapshot: FamilySnapshot }) {
  const [anchor, setAnchor] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const days = useMemo(() => {
    if (view === "month") return monthGrid(anchor);
    if (view === "week") return weekDays(anchor);
    return [anchor];
  }, [anchor, view]);

  const selectedHandover: Handover | undefined = snapshot.handovers.find(
    (item) => selectedEvent?.handoverId === item.id,
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">Agenda</h1>
          <p className="mt-1 text-[color:var(--nest-muted)]">
            {format(anchor, "MMMM yyyy", { locale: nl })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vakanties" className="h-11 rounded-full border border-[color:var(--nest-border)] px-4 text-sm leading-11">
            Vakanties
          </Link>
          <Link href="/jaaroverzicht" className="h-11 rounded-full border border-[color:var(--nest-border)] px-4 text-sm leading-11">
            Jaaroverzicht
          </Link>
          {(["month", "week", "day"] as View[]).map((item) => (
            <button
              key={item}
              onClick={() => setView(item)}
              className={`h-11 rounded-full px-4 text-sm ${view === item ? "bg-[color:var(--nest-ink)] text-white" : "border border-[color:var(--nest-border)]"}`}
            >
              {item === "month" ? "Maand" : item === "week" ? "Week" : "Dag"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <button
          className="h-11 rounded-full border border-[color:var(--nest-border)] px-4"
          onClick={() =>
            setAnchor((current) =>
              view === "month"
                ? addMonths(current, -1)
                : new Date(current.getTime() - (view === "week" ? 7 : 1) * 86400000),
            )
          }
        >
          Vorige
        </button>
        <button className="text-sm text-[color:var(--nest-muted)]" onClick={() => setAnchor(new Date())}>
          Vandaag
        </button>
        <button
          className="h-11 rounded-full border border-[color:var(--nest-border)] px-4"
          onClick={() =>
            setAnchor((current) =>
              view === "month"
                ? addMonths(current, 1)
                : new Date(current.getTime() + (view === "week" ? 7 : 1) * 86400000),
            )
          }
        >
          Volgende
        </button>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-1">
          {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
            <div key={d} className="px-1 pb-2 text-center text-xs text-[color:var(--nest-muted)]">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const iso = toISODate(day);
            const occ = snapshot.occurrences.find((item) => item.date === iso);
            const color = snapshot.members.find((m) => m.id === occ?.custodianMemberId)?.displayColor;
            const events = snapshot.events.filter((item) => item.startsAt.startsWith(iso) && !item.cancelledAt);
            return (
              <button
                key={iso}
                onClick={() => {
                  setSelectedDate(iso);
                  setChangeOpen(true);
                }}
                className="min-h-24 rounded-2xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-2 text-left"
                style={{ background: color ? `${color}18` : undefined }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{day.getDate()}</span>
                  {occ ? (
                    <span className="text-[10px] text-[color:var(--nest-muted)]">
                      Bij {memberLabel(snapshot.members, occ.custodianMemberId).toLowerCase()}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 space-y-1">
                  {events.slice(0, 2).map((event) => (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className="block w-full truncate rounded-md bg-white/70 px-1 py-0.5 text-left text-[11px]"
                    >
                      {event.category === "overdracht" ? "Overdracht" : event.title}
                    </button>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={view === "week" ? "grid gap-3 md:grid-cols-7" : "space-y-3"}>
          {days.map((day) => {
            const iso = toISODate(day);
            const occ = snapshot.occurrences.find((item) => item.date === iso);
            const events = snapshot.events
              .filter((item) => item.startsAt.startsWith(iso) && !item.cancelledAt)
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
            return (
              <section key={iso} className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-medium">{format(day, "EEE d MMM", { locale: nl })}</h2>
                  {occ ? (
                    <span className="text-xs text-[color:var(--nest-muted)]">
                      Bij {memberLabel(snapshot.members, occ.custodianMemberId).toLowerCase()}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full rounded-2xl bg-[color:var(--nest-bg)] px-3 py-2 text-left"
                    >
                      <p className="text-xs text-[color:var(--nest-muted)]">{event.allDay ? "Hele dag" : formatTime(event.startsAt)}</p>
                      <p className="font-medium">{event.title}</p>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSelectedDate(iso);
                      setChangeOpen(true);
                    }}
                    className="w-full rounded-2xl border border-dashed border-[color:var(--nest-border)] py-2 text-sm text-[color:var(--nest-muted)]"
                  >
                    Wijziging voorstellen
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setCreateOpen(true)}
        className="mt-6 h-12 rounded-full bg-[color:var(--nest-ink)] px-5 text-white"
      >
        Nieuwe afspraak
      </button>

      <Sheet open={Boolean(selectedEvent)} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedEvent ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-[family-name:var(--font-display)] text-2xl">
                  {selectedEvent.title}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-3 px-4 pb-6">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs ${eventCategoryTone[selectedEvent.category]}`}>
                  {eventCategoryLabel[selectedEvent.category]}
                </span>
                <p className="text-sm text-[color:var(--nest-muted)]">
                  {formatTime(selectedEvent.startsAt)} – {formatTime(selectedEvent.endsAt)}
                </p>
                {selectedEvent.location ? <p>{selectedEvent.location}</p> : null}
                {selectedHandover ? (
                  <div className="rounded-2xl bg-[color:var(--nest-bg)] p-4 text-sm">
                    <p>
                      {memberLabel(snapshot.members, selectedHandover.fromMemberId)} →{" "}
                      {memberLabel(snapshot.members, selectedHandover.toMemberId)}
                    </p>
                    <p className="mt-1">
                      Ophalen: {memberLabel(snapshot.members, selectedHandover.pickupMemberId ?? selectedHandover.toMemberId)}
                    </p>
                    {selectedHandover.packingList.length ? (
                      <ul className="mt-2 list-disc pl-4">
                        {selectedHandover.packingList.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {selectedEvent.packingList.length ? (
                  <p className="text-sm">Meenemen: {selectedEvent.packingList.join(", ")}</p>
                ) : null}
                {selectedEvent.childIds.length ? (
                  <p className="text-sm">
                    {snapshot.children
                      .filter((child) => selectedEvent.childIds.includes(child.id))
                      .map((child) => child.firstName)
                      .join(", ")}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={changeOpen} onOpenChange={setChangeOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Wijziging voorstellen</SheetTitle>
          </SheetHeader>
          {selectedDate ? (
            <form action={createChangeRequestAction} className="space-y-3 px-4 pb-6" onSubmit={() => setChangeOpen(false)}>
              <input type="hidden" name="targetDate" value={selectedDate} />
              <label className="block text-sm">
                Wat wil je wijzigen?
                <select name="type" className="mt-1 h-12 w-full rounded-2xl border border-[color:var(--nest-border)] bg-white px-3">
                  {Object.entries(changeRequestLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Wie neemt over?
                <select name="requestedCustodianMemberId" className="mt-1 h-12 w-full rounded-2xl border border-[color:var(--nest-border)] bg-white px-3">
                  {snapshot.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.parentLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Bericht
                <textarea
                  name="message"
                  required
                  defaultValue={`Kun jij ${selectedDate} overnemen?`}
                  className="mt-1 min-h-24 w-full rounded-2xl border border-[color:var(--nest-border)] bg-white p-3"
                />
              </label>
              <button className="h-12 w-full rounded-full bg-[color:var(--nest-ink)] text-white">Versturen</button>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Nieuwe afspraak</SheetTitle>
          </SheetHeader>
          <form action={createEventAction} className="space-y-3 px-4 pb-6" onSubmit={() => setCreateOpen(false)}>
            <input name="title" required placeholder="Titel" className="h-12 w-full rounded-2xl border border-[color:var(--nest-border)] px-3" />
            <input name="date" type="date" required defaultValue={toISODate(anchor)} className="h-12 w-full rounded-2xl border border-[color:var(--nest-border)] px-3" />
            <div className="grid grid-cols-2 gap-2">
              <input name="start" type="time" defaultValue="18:00" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
              <input name="end" type="time" defaultValue="19:00" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
            </div>
            <select name="category" className="h-12 w-full rounded-2xl border border-[color:var(--nest-border)] px-3">
              {Object.entries(eventCategoryLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {snapshot.children.map((child) => (
              <label key={child.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="childIds" value={child.id} defaultChecked />
                {child.firstName}
              </label>
            ))}
            <input name="location" placeholder="Locatie" className="h-12 w-full rounded-2xl border border-[color:var(--nest-border)] px-3" />
            <input name="packingList" placeholder="Meenemen, kommagescheiden" className="h-12 w-full rounded-2xl border border-[color:var(--nest-border)] px-3" />
            <button className="h-12 w-full rounded-full bg-[color:var(--nest-ink)] text-white">Opslaan</button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
