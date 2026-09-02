import { addDaysIso, calendarDateInTimeZone, formatDayLong } from "@/lib/dates";
import { custodianForChild } from "@/lib/calendar/helpers";
import { parentName } from "@/lib/queries/family-view";
import { childCustodyLabel, childTimelineForDate, type ChildTimelineEntry } from "@/lib/queries/vandaag";
import { inferPackingContext, templateLabelsForContext } from "@/lib/packing/templates";
import { weekGlance, type WeekGlance } from "@/lib/queries/smart-today";
import type {
  CalendarEvent,
  FamilySnapshot,
  NeededItemLocation,
  PackingContext,
} from "@/lib/domain/types";

export type SignalPriority = "info" | "attention" | "important";

export type DaySignalAction =
  | {
      kind: "assign_transport";
      eventId: string;
      role: "dropoff" | "pickup";
    }
  | {
      kind: "add_packing";
      childId: string;
      label: string;
      context: PackingContext;
      eventId: string | null;
      handoverId: string | null;
      dueOn: string;
    }
  | { kind: "set_schedule" };

export type DaySignal = {
  id: string;
  priority: SignalPriority;
  title: string;
  body?: string;
  href?: string;
  action?: DaySignalAction;
};

export type DayPackingLine = {
  key: string;
  childId: string;
  childName: string;
  label: string;
  checked: boolean;
  itemId: string | null;
  context: PackingContext;
  eventId: string | null;
  handoverId: string | null;
  dueOn: string;
};

export type DayTaskLine = {
  id: string;
  title: string;
  childName: string | null;
  href: string;
};

export type ChildDayContext = {
  childId: string;
  childName: string;
  stayLabel: string;
  stayUnknown: boolean;
  handover: { time: string; label: string; href: string } | null;
  timeline: ChildTimelineEntry[];
};

export type FamilyDayKind = "today" | "tomorrow" | "other";

export type FamilyDayContext = {
  date: string;
  kind: FamilyDayKind;
  heading: string;
  intro: string;
  children: ChildDayContext[];
  packing: DayPackingLine[];
  tasks: DayTaskLine[];
  alerts: DaySignal[];
  ready: boolean;
  quiet: boolean;
  counts: {
    events: number;
    handovers: number;
    packingOpen: number;
    tasksOpen: number;
  };
  /** Hook for Famli Week (P1). Not rendered in this PR. */
  weekGlance: WeekGlance;
};

function sameLabel(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function coversLabel(have: string[], need: string) {
  const n = need.trim().toLowerCase();
  if (!n) return true;
  return have.some((item) => {
    const h = item.trim().toLowerCase();
    return h === n || h.includes(n) || n.includes(h);
  });
}

function eventsOnDate(snapshot: FamilySnapshot, date: string): CalendarEvent[] {
  return snapshot.events.filter(
    (item) => !item.cancelledAt && item.startsAt.startsWith(date) && item.category !== "overdracht",
  );
}

function isPickupTitle(title: string) {
  return /ophalen/i.test(title);
}

function needsDriver(event: CalendarEvent): boolean {
  if (isPickupTitle(event.title)) return false;
  return event.category === "sport" || event.category === "feestje" || event.category === "activiteit";
}

function memberIsMama(snapshot: FamilySnapshot, memberId: string) {
  const member = snapshot.members.find((item) => item.id === memberId);
  const name = `${member?.parentLabel ?? ""} ${parentName(snapshot, memberId)}`.toLowerCase();
  return /mama|moeder/.test(name);
}

function memberIsPapa(snapshot: FamilySnapshot, memberId: string) {
  const member = snapshot.members.find((item) => item.id === memberId);
  const name = `${member?.parentLabel ?? ""} ${parentName(snapshot, memberId)}`.toLowerCase();
  return /papa|vader/.test(name);
}

function locationConflictsStay(
  location: NeededItemLocation | null | undefined,
  custodianId: string | null,
  snapshot: FamilySnapshot,
): boolean {
  if (!location || !custodianId) return false;
  if (location === "bij_mama") return memberIsPapa(snapshot, custodianId);
  if (location === "bij_papa") return memberIsMama(snapshot, custodianId);
  return false;
}

function uniquePackingLines(lines: DayPackingLine[]): DayPackingLine[] {
  const result: DayPackingLine[] = [];
  for (const line of lines) {
    const index = result.findIndex(
      (row) => row.childId === line.childId && (sameLabel(row.label, line.label) || coversLabel([row.label], line.label)),
    );
    if (index < 0) {
      result.push(line);
      continue;
    }
    const existing = result[index]!;
    if (!existing.itemId && line.itemId) result[index] = line;
    else if (existing.itemId && line.itemId && line.checked && !existing.checked) result[index] = line;
  }
  return result;
}

export function familyCalendarDate(snapshot: FamilySnapshot, now = new Date()): string {
  return calendarDateInTimeZone(now, snapshot.currentProfile.timezone || "Europe/Amsterdam");
}

export function buildFamilyDayContext(
  snapshot: FamilySnapshot,
  date: string,
  now = new Date(),
): FamilyDayContext {
  const today = familyCalendarDate(snapshot, now);
  const tomorrow = addDaysIso(today, 1);
  const kind: FamilyDayKind = date === today ? "today" : date === tomorrow ? "tomorrow" : "other";
  const dayWord = kind === "today" ? "vandaag" : kind === "tomorrow" ? "morgen" : formatDayLong(date);
  const headingPrefix = kind === "today" ? "Vandaag" : kind === "tomorrow" ? "Morgen" : "Dag";

  const events = eventsOnDate(snapshot, date);
  const handovers = snapshot.handovers.filter((item) => !item.cancelledAt && item.date === date);
  const packingItems = (snapshot.packingItems ?? []).filter((item) => item.dueOn === date);

  const children: ChildDayContext[] = snapshot.children.map((child) => {
    const custodianId = custodianForChild(snapshot, date, child.id);
    const handover = handovers.find((item) => item.childIds.includes(child.id)) ?? null;
    const stayUnknown = !custodianId;
    return {
      childId: child.id,
      childName: child.firstName,
      stayLabel: stayUnknown
        ? `We weten nog niet waar ${child.firstName} ${dayWord} is.`
        : childCustodyLabel(snapshot, child.id, date),
      stayUnknown,
      handover: handover
        ? {
            time: handover.time,
            label: `Wissel om ${handover.time}`,
            href: `/agenda?date=${date}&view=wissels`,
          }
        : null,
      timeline: childTimelineForDate(snapshot, child.id, date),
    };
  });

  const packing: DayPackingLine[] = [];

  for (const item of packingItems) {
    const child = snapshot.children.find((row) => row.id === item.childId);
    if (!child) continue;
    packing.push({
      key: item.id,
      childId: item.childId,
      childName: child.firstName,
      label: item.label,
      checked: item.checked,
      itemId: item.id,
      context: item.context,
      eventId: item.eventId,
      handoverId: item.handoverId,
      dueOn: date,
    });
  }

  for (const event of events) {
    const context = inferPackingContext(event.title, event.category);
    const auto =
      context === "school" && !(event.packingList ?? []).length ? [] : templateLabelsForContext(context);
    const labels = [...(event.packingList ?? []), ...auto];
    for (const childId of event.childIds) {
      const child = snapshot.children.find((row) => row.id === childId);
      if (!child) continue;
      for (const label of labels) {
        packing.push({
          key: `sug-${event.id}-${childId}-${label}`,
          childId,
          childName: child.firstName,
          label,
          checked: false,
          itemId: null,
          context,
          eventId: event.id,
          handoverId: null,
          dueOn: date,
        });
      }
    }
  }

  for (const handover of handovers) {
    for (const childId of handover.childIds) {
      const child = snapshot.children.find((row) => row.id === childId);
      if (!child) continue;
      for (const label of handover.packingList ?? []) {
        packing.push({
          key: `sug-${handover.id}-${childId}-${label}`,
          childId,
          childName: child.firstName,
          label,
          checked: false,
          itemId: null,
          context: "handover",
          eventId: null,
          handoverId: handover.id,
          dueOn: date,
        });
      }
    }
  }

  const packingUnique = uniquePackingLines(packing);

  const tasks: DayTaskLine[] = snapshot.tasks
    .filter(
      (item) =>
        item.kind === "one_off" &&
        item.status !== "done" &&
        item.dueAt?.slice(0, 10) === date,
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      childName: item.childId
        ? snapshot.children.find((child) => child.id === item.childId)?.firstName ?? null
        : null,
      href: `/regelen?tab=taken&id=${item.id}`,
    }));

  const openPacking = packingUnique.filter((item) => !item.checked);
  const quiet =
    events.length === 0 &&
    handovers.length === 0 &&
    packingUnique.length === 0 &&
    tasks.length === 0;

  const alerts = quiet
    ? []
    : collectSignals({ snapshot, date, children, events, packingUnique, tasks, dayWord });

  const packingOpen = openPacking.length;
  const blockingAlerts = alerts.filter((item) => item.priority !== "info");
  const ready =
    !quiet &&
    packingOpen === 0 &&
    tasks.length === 0 &&
    blockingAlerts.length === 0 &&
    children.every((child) => !child.stayUnknown || child.timeline.length === 0);

  return {
    date,
    kind,
    heading: `${headingPrefix} · ${formatDayLong(date)}`,
    intro: quiet
      ? kind === "tomorrow"
        ? "Morgen is rustig."
        : "Vandaag is rustig."
      : ready
        ? kind === "tomorrow"
          ? "Morgen staat klaar ✓"
          : "Vandaag staat klaar ✓"
        : `Dit staat er ${dayWord} voor jullie klaar.`,
    children,
    packing: packingUnique,
    tasks,
    alerts: ready ? [] : alerts.slice(0, 3),
    ready,
    quiet,
    counts: {
      events: events.length,
      handovers: handovers.length,
      packingOpen,
      tasksOpen: tasks.length,
    },
    weekGlance: weekGlance(snapshot, now),
  };
}

function collectSignals(input: {
  snapshot: FamilySnapshot;
  date: string;
  children: ChildDayContext[];
  events: CalendarEvent[];
  packingUnique: DayPackingLine[];
  tasks: DayTaskLine[];
  dayWord: string;
}): DaySignal[] {
  const { snapshot, date, children, events, packingUnique, tasks, dayWord } = input;
  const ranked: DaySignal[] = [];

  for (const child of children) {
    if (!child.stayUnknown || child.timeline.length === 0) continue;
    ranked.push({
      id: `stay-${child.childId}`,
      priority: "important",
      title: `We weten nog niet waar ${child.childName} ${dayWord} is.`,
      href: "/jaaroverzicht",
      action: { kind: "set_schedule" },
    });
  }

  for (const event of events) {
    if (!isPickupTitle(event.title) || !event.pickupMemberId) continue;
    for (const childId of event.childIds) {
      const child = children.find((row) => row.childId === childId);
      const custodianId = custodianForChild(snapshot, date, childId);
      if (!child || !custodianId || custodianId === event.pickupMemberId) continue;
      ranked.push({
        id: `mismatch-${event.id}-${childId}`,
        priority: "attention",
        title: `${parentName(snapshot, event.pickupMemberId)} haalt ${child.childName} op, maar het schema zegt dat ze bij ${parentName(snapshot, custodianId).toLowerCase()} blijft.`,
        href: `/agenda?date=${date}&focus=${event.id}`,
      });
    }
  }

  for (const event of events) {
    if (!needsDriver(event) || event.dropoffMemberId) continue;
    const child = snapshot.children.find((row) => event.childIds.includes(row.id));
    if (!child) continue;
    ranked.push({
      id: `bring-${event.id}`,
      priority: "attention",
      title: `Wie brengt ${child.firstName} naar ${shortTitle(event.title)}?`,
      href: `/agenda?date=${date}&focus=${event.id}`,
      action: { kind: "assign_transport", eventId: event.id, role: "dropoff" },
    });
  }

  for (const event of events) {
    const context = inferPackingContext(event.title, event.category);
    if (context === "school") continue;
    const expected = templateLabelsForContext(context);
    if (!expected.length) continue;
    for (const childId of event.childIds) {
      const child = snapshot.children.find((row) => row.id === childId);
      if (!child) continue;
      const have = packingUnique.filter((row) => row.childId === childId).map((row) => row.label);
      for (const label of expected) {
        if (coversLabel(have, label)) continue;
        ranked.push({
          id: `pack-miss-${event.id}-${childId}-${label}`,
          priority: "attention",
          title: `De ${label.toLowerCase()} moet mee.`,
          href: `/agenda?date=${date}&focus=${event.id}`,
          action: {
            kind: "add_packing",
            childId,
            label,
            context,
            eventId: event.id,
            handoverId: null,
            dueOn: date,
          },
        });
      }
    }
  }

  for (const item of snapshot.neededItems) {
    if (item.status === "gekocht" || item.status === "niet_meer_nodig") continue;
    if (item.dueOn && item.dueOn !== date) continue;
    if (!item.dueOn && !item.eventId) continue;
    if (item.eventId && !events.some((event) => event.id === item.eventId)) continue;
    const child = snapshot.children.find((row) => row.id === item.childId);
    const custodianId = custodianForChild(snapshot, date, item.childId);
    if (!child || !locationConflictsStay(item.location, custodianId, snapshot)) continue;
    const where = item.location === "bij_mama" ? "mama" : "papa";
    ranked.push({
      id: `loc-${item.id}`,
      priority: "attention",
      title: `${item.title} staat nog bij ${where}, maar ${child.firstName} is dan bij ${parentName(snapshot, custodianId!).toLowerCase()}.`,
      href: `/kinderen/${child.id}?tab=nodig`,
    });
  }

  for (const task of tasks) {
    ranked.push({
      id: `task-${task.id}`,
      priority: "info",
      title: `Nog regelen: ${task.title}`,
      href: task.href,
    });
  }

  const seen = new Set<string>();
  const unique: DaySignal[] = [];
  for (const signal of ranked) {
    if (seen.has(signal.title)) continue;
    seen.add(signal.title);
    unique.push(signal);
  }
  return unique;
}

function shortTitle(title: string) {
  return title.replace(/ Roxy| Sophie/g, "").trim() || title;
}

export function famliMorgenEntityId(date: string): string {
  const compact = date.replace(/-/g, "");
  return `a1111111-1111-4111-a111-${compact}0000`;
}

export function inAppFamliMorgenBody(ctx: FamilyDayContext): string {
  if (ctx.quiet) return "Morgen is rustig.";
  if (ctx.ready) return "Morgen staat klaar.";
  const n = ctx.counts.events + ctx.counts.handovers;
  const m = ctx.counts.packingOpen + ctx.counts.tasksOpen + ctx.alerts.length;
  const planning = n === 1 ? "1 ding op de planning" : `${n} dingen op de planning`;
  if (m <= 0) return `Morgen staan er ${planning}.`;
  const open = m === 1 ? "1 ding geregeld worden" : `${m} dingen geregeld worden`;
  return `Morgen staan er ${planning}. Er moeten nog ${open}.`;
}

export function famliMorgenEmailCopy(ctx: FamilyDayContext): { subject: string; body: string } {
  return {
    subject: "Famli Morgen",
    body: [
      "Famli Morgen",
      "",
      "Morgen heeft jullie gezin:",
      `${ctx.counts.events} afspraken`,
      `${ctx.counts.handovers} wisselmoment${ctx.counts.handovers === 1 ? "" : "en"}`,
      `${ctx.counts.packingOpen} dingen die mee moeten`,
      `${ctx.counts.tasksOpen} dingen die nog geregeld moeten worden`,
      "",
      "Bekijk morgen in Famli",
    ].join("\n"),
  };
}
