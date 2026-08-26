import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { formatDayLong, formatTime, toISODate } from "@/lib/dates";
import { custodianForChild } from "@/lib/calendar/helpers";
import { neededLocationLabel } from "@/lib/domain/labels";
import { overnightMemberId, parentName } from "@/lib/queries/family-view";
import type { Child, FamilySnapshot, NeededItem } from "@/lib/domain/types";

export type ChildPlace = {
  label: string;
  detail: string | null;
  nextLabel: string | null;
  nextTime: string | null;
  href: string;
  kind: "ouder" | "school" | "sport" | "feestje" | "reis" | "overig";
};

export function childPlace(snapshot: FamilySnapshot, child: Child, now = new Date()): ChildPlace {
  const today = toISODate(now);
  const stamp = now.toISOString().slice(0, 16);
  const emptyNext = { nextLabel: null as string | null, nextTime: null as string | null };

  const travel = snapshot.travelPlans.find(
    (plan) => plan.childIds.includes(child.id) && plan.startsOn <= today && plan.endsOn >= today,
  );
  if (travel) {
    const withName = parentName(snapshot, travel.withMemberId);
    return {
      label: `Op vakantie met ${withName.toLowerCase()}`,
      detail: `${travel.destination} · terug ${formatDayLong(travel.endsOn)}`,
      ...emptyNext,
      href: `/kinderen/${child.id}?tab=reizen`,
      kind: "reis",
    };
  }

  const studiedag = snapshot.events.some(
    (event) =>
      !event.cancelledAt &&
      event.schoolKind === "studiedag" &&
      event.childIds.includes(child.id) &&
      event.startsAt.slice(0, 10) === today,
  );

  const current = snapshot.events.find((event) => {
    if (event.cancelledAt || !event.childIds.includes(child.id)) return false;
    if (studiedag && event.category === "school" && event.schoolKind !== "studiedag") return false;
    const start = event.startsAt.slice(0, 16);
    const end = event.endsAt.slice(0, 16);
    return start <= stamp && end >= stamp;
  });
  if (current) {
    const next = nextPlaceTransition(snapshot, child, now);
    if (current.category === "school" && current.schoolKind !== "studiedag") {
      return {
        label: "Op school",
        detail: current.location,
        ...next,
        href: `/agenda?date=${today}&focus=${current.id}`,
        kind: "school",
      };
    }
    if (current.category === "sport") {
      return { label: current.title, detail: current.location, ...next, href: `/agenda?date=${today}&focus=${current.id}`, kind: "sport" };
    }
    if (current.category === "feestje") {
      return { label: current.title, detail: current.location, ...next, href: `/agenda?date=${today}&focus=${current.id}`, kind: "feestje" };
    }
  }

  const memberId = custodianForChild(snapshot, today, child.id) ?? overnightMemberId(snapshot, today);
  const custodyLabel =
    memberId === snapshot.currentMember.id
      ? "Bij jou"
      : memberId
        ? `Bij ${parentName(snapshot, memberId).toLowerCase()}`
        : "Nog niet ingepland";

  const next = nextPlaceTransition(snapshot, child, now);

  if (memberId === snapshot.currentMember.id) {
    return { label: custodyLabel, detail: null, ...next, href: `/kinderen/${child.id}`, kind: "ouder" };
  }
  if (memberId) {
    return { label: custodyLabel, detail: null, ...next, href: `/kinderen/${child.id}`, kind: "ouder" };
  }
  return { label: "Nog niet ingepland", detail: null, ...emptyNext, href: `/kinderen/${child.id}`, kind: "overig" };
}

function nextPlaceTransition(snapshot: FamilySnapshot, child: Child, now: Date) {
  const today = toISODate(now);
  const stamp = now.toISOString().slice(0, 16);

  const handover = snapshot.handovers.find(
    (item) => !item.cancelledAt && item.date === today && item.childIds.includes(child.id) && `${item.date}T${item.time}` > stamp,
  );
  if (handover) {
    const toName =
      handover.toMemberId === snapshot.currentMember.id
        ? "bij jou"
        : `bij ${parentName(snapshot, handover.toMemberId).toLowerCase()}`;
    return { nextLabel: toName, nextTime: handover.time };
  }

  const nextEvent = snapshot.events
    .filter(
      (event) =>
        !event.cancelledAt &&
        event.childIds.includes(child.id) &&
        event.startsAt.slice(0, 10) === today &&
        event.startsAt.slice(0, 16) > stamp &&
        (event.category === "school" || /ophalen/i.test(event.title) || event.category === "overdracht"),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  if (nextEvent) {
    if (nextEvent.category === "school" && nextEvent.schoolKind !== "studiedag") {
      return { nextLabel: "op school", nextTime: formatTime(nextEvent.startsAt) };
    }
    if (/ophalen/i.test(nextEvent.title)) {
      const who = nextEvent.pickupMemberId ?? nextEvent.memberIds[0];
      const label =
        who === snapshot.currentMember.id ? "jij haalt op" : `${parentName(snapshot, who).toLowerCase()} haalt op`;
      return { nextLabel: label, nextTime: formatTime(nextEvent.startsAt) };
    }
  }

  return { nextLabel: null, nextTime: null };
}

export type ImportantBit = { id: string; title: string; detail: string; href: string };

export function nowImportant(snapshot: FamilySnapshot, childId: string, now = new Date()): ImportantBit[] {
  const today = toISODate(now);
  const bits: ImportantBit[] = [];
  const child = snapshot.children.find((item) => item.id === childId);
  if (!child) return [];

  for (const item of snapshot.neededItems.filter((row) => row.childId === childId && row.status !== "gekocht" && row.status !== "niet_meer_nodig")) {
    bits.push({
      id: item.id,
      title: item.title,
      detail: [item.size ? `Maat ${item.size}` : null, item.dueOn ? `vóór ${formatDayLong(item.dueOn)}` : null]
        .filter(Boolean)
        .join(" · "),
      href: `/kinderen/${childId}?tab=nodig`,
    });
  }

  for (const party of snapshot.parties.filter((row) => row.forChildId === childId)) {
    const event = snapshot.events.find((item) => item.id === party.eventId && !item.cancelledAt && item.startsAt.slice(0, 10) >= today);
    if (!event) continue;
    bits.push({
      id: party.id,
      title: event.title,
      detail: `${formatDayLong(event.startsAt)} · ${formatTime(event.startsAt)}`,
      href: `/agenda?date=${event.startsAt.slice(0, 10)}&focus=${event.id}`,
    });
  }

  for (const event of snapshot.events.filter(
    (item) =>
      !item.cancelledAt &&
      item.childIds.includes(childId) &&
      item.startsAt.slice(0, 10) >= today &&
      (item.schoolKind === "studiedag" || item.schoolKind === "schoolreis" || item.schoolKind === "ouderavond"),
  )) {
    bits.push({
      id: event.id,
      title: event.title,
      detail: formatDayLong(event.startsAt),
      href: `/agenda?date=${event.startsAt.slice(0, 10)}&focus=${event.id}`,
    });
  }

  if (child.passportExpiresOn) {
    const days = differenceInCalendarDays(parseISO(child.passportExpiresOn), now);
    if (days >= 0 && days <= 90) {
      bits.push({
        id: `passport-${child.id}`,
        title: "Paspoort verloopt binnenkort",
        detail: days < 60 ? `Over ${days} dagen` : formatDayLong(child.passportExpiresOn),
        href: `/kinderen/${child.id}?tab=documenten`,
      });
    }
  }

  const match = snapshot.events.find(
    (item) =>
      !item.cancelledAt &&
      item.childIds.includes(childId) &&
      item.category === "sport" &&
      /wedstrijd/i.test(item.title) &&
      item.startsAt.slice(0, 10) >= today,
  );
  if (match) {
    bits.push({
      id: match.id,
      title: match.title,
      detail: `${formatDayLong(match.startsAt)} · ${formatTime(match.startsAt)}`,
      href: `/agenda?date=${match.startsAt.slice(0, 10)}&focus=${match.id}`,
    });
  }

  return bits.slice(0, 5);
}

export function activeTravel(snapshot: FamilySnapshot, childId: string, today: string) {
  return snapshot.travelPlans.find(
    (plan) => plan.childIds.includes(childId) && plan.startsOn <= today && plan.endsOn >= today,
  );
}

export function upcomingTravel(snapshot: FamilySnapshot, today: string) {
  return snapshot.travelPlans
    .filter((plan) => plan.startsOn > today)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
}

export function neededHeadline(item: NeededItem, snapshot: FamilySnapshot) {
  if (item.status === "gekocht") {
    const who = item.purchasedByMemberId ? parentName(snapshot, item.purchasedByMemberId) : "een ouder";
    return `Gekocht door ${who}`;
  }
  if (item.status === "wordt_geregeld" && item.assigneeMemberId) {
    if (item.assigneeMemberId === snapshot.currentMember.id) return "Jij regelt dit";
    return `${parentName(snapshot, item.assigneeMemberId)} regelt dit`;
  }
  if (item.location && item.location !== "onbekend") {
    const loc =
      item.location === "custom" && item.locationCustom
        ? item.locationCustom
        : neededLocationLabel[item.location].toLowerCase();
    return `Staat ${loc}`;
  }
  return "Nog kopen";
}

export function daysUntil(date: string, from = new Date()) {
  return differenceInCalendarDays(parseISO(date), from);
}

export function nextSchoolDayOff(snapshot: FamilySnapshot, childId: string, today: string) {
  return snapshot.events
    .filter(
      (event) =>
        !event.cancelledAt &&
        event.childIds.includes(childId) &&
        event.schoolKind === "studiedag" &&
        event.startsAt.slice(0, 10) >= today,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
}

export function stayHeadline(snapshot: FamilySnapshot, now = new Date()) {
  const names = snapshot.children.map((child) => child.firstName);
  const joined = names.length === 2 ? `${names[0]} & ${names[1]}` : names.join(", ");
  const verb = names.length === 1 ? "is" : "zijn";
  const places = snapshot.children.map((child) => childPlace(snapshot, child, now));
  const travel = places.find((place) => place.kind === "reis");
  if (travel && snapshot.children.length) {
    const child = snapshot.children[places.indexOf(travel)];
    if (places.every((place) => place.kind === "reis" && place.label === travel.label)) {
      return `${joined} ${verb} ${travel.label.toLowerCase()}`;
    }
    return `${child?.firstName ?? "Kind"} ${travel.label.toLowerCase()}`;
  }
  const memberId = overnightMemberId(snapshot, toISODate(now));
  if (!memberId) return "Verblijf is nog niet ingepland";
  if (memberId === snapshot.currentMember.id) return `${joined} ${verb} vandaag bij jou`;
  return `${joined} ${verb} vandaag bij ${parentName(snapshot, memberId).toLowerCase()}`;
}

export type SoonItem = { id: string; title: string; detail: string; href: string };

export function forgetNot(snapshot: FamilySnapshot, now = new Date()) {
  const horizon = toISODate(addDays(now, 14));
  return snapshot.neededItems
    .filter((item) => item.status !== "gekocht" && item.status !== "niet_meer_nodig")
    .filter((item) => !item.dueOn || item.dueOn <= horizon)
    .sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999"))
    .slice(0, 5);
}

export function comingSoon(snapshot: FamilySnapshot, now = new Date()): SoonItem[] {
  const today = toISODate(now);
  const items: SoonItem[] = [];
  for (const event of snapshot.events.filter(
    (item) =>
      !item.cancelledAt &&
      item.startsAt.slice(0, 10) > today &&
      (item.schoolKind === "studiedag" || item.schoolKind === "schoolreis" || item.category === "feestje" || item.category === "vakantie"),
  )) {
    const days = daysUntil(event.startsAt.slice(0, 10), now);
    items.push({
      id: event.id,
      title: event.title,
      detail: days === 1 ? "morgen" : days < 21 ? `over ${days} dagen` : formatDayLong(event.startsAt),
      href: `/agenda?date=${event.startsAt.slice(0, 10)}&focus=${event.id}`,
    });
  }
  for (const plan of upcomingTravel(snapshot, today)) {
    if (items.some((item) => item.title === plan.title)) continue;
    const days = daysUntil(plan.startsOn, now);
    items.push({
      id: plan.id,
      title: plan.title,
      detail: days > 0 ? `over ${days} dagen` : formatDayLong(plan.startsOn),
      href: `/kinderen/${plan.childIds[0]}?tab=reizen`,
    });
  }
  return items.slice(0, 4);
}

export function dayCover(snapshot: FamilySnapshot, date: string) {
  const vacation = snapshot.vacations.find((item) => item.startsOn <= date && item.endsOn >= date);
  const travel = snapshot.travelPlans.find((item) => item.startsOn <= date && item.endsOn >= date);
  return { vacation, travel };
}

export { addDays, toISODate };
