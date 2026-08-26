"use client";

import Link from "next/link";
import { formatTime } from "@/lib/dates";
import { childNames, overnightMemberId, parentName } from "@/lib/queries/family-view";
import type { CalendarEvent, FamilySnapshot } from "@/lib/domain/types";
import { HandoverDetail } from "@/components/calendar/handover-event";

export function EventDetail({ snapshot, event }: { snapshot: FamilySnapshot; event: CalendarEvent }) {
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
      {handover ? <HandoverDetail snapshot={snapshot} handover={handover} /> : null}
      {event.schoolKind === "studiedag" ? (
        <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4">
          <p className="font-medium">Geen school.</p>
          <p className="mt-2">Wie is bij {child?.firstName ?? "dit kind"}?</p>
          <p className="text-lg font-semibold">{night ? parentName(snapshot, night) : "Nog niet geregeld"}</p>
          <Link href="/regelen?tab=taken" className="mt-3 inline-flex text-sm font-medium text-[color:var(--famli-brand)]">
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
            Cadeau:{" "}
            {gift?.status === "gekocht"
              ? `Gekocht door ${gift.purchasedByMemberId ? parentName(snapshot, gift.purchasedByMemberId) : "een ouder"}`
              : "Nog regelen"}
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
      {event.packingList.length ? <p>Meenemen: {event.packingList.join(", ")}</p> : null}
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
