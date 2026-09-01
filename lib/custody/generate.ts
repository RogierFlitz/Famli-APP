import { addDaysIso, daysBetween, toISODate } from "@/lib/dates";
import type {
  CustodyOccurrence,
  CustodySchedule,
  FamilyMember,
  Handover,
} from "@/lib/domain/types";

function weekdayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

export function custodianForDate(
  schedule: CustodySchedule,
  isoDate: string,
): string {
  const { patternType, config, startsOn } = schedule;
  const offset = daysBetween(startsOn, isoDate);
  if (offset < 0) {
    return config.parentAMemberId;
  }

  if (patternType === "week_on_week_off") {
    const week = Math.floor(offset / 7);
    return week % 2 === 0 ? config.parentAMemberId : config.parentBMemberId;
  }

  if (patternType === "two_two_three") {
    const cycle = offset % 14;
    const a = config.parentAMemberId;
    const b = config.parentBMemberId;
    if (cycle <= 1 || (cycle >= 4 && cycle <= 6) || (cycle >= 9 && cycle <= 10)) {
      return a;
    }
    return b;
  }

  if (patternType === "fixed_weekdays" && config.weekdayMemberIds?.length === 7) {
    return config.weekdayMemberIds[weekdayIndex(isoDate)];
  }

  if (patternType === "custom" && config.dayCycle && config.dayCycle.length > 0) {
    return config.dayCycle[offset % config.dayCycle.length];
  }

  return config.parentAMemberId;
}

export function generateOccurrences(params: {
  schedule: CustodySchedule;
  from: string;
  to: string;
  existing?: CustodyOccurrence[];
}): CustodyOccurrence[] {
  const { schedule, from, to, existing = [] } = params;
  const overrideByDate = new Map(
    existing
      .filter((item) => item.isOverride)
      .map((item) => [item.date, item]),
  );

  const result: CustodyOccurrence[] = [];
  let cursor = from;
  while (cursor <= to) {
    const override = overrideByDate.get(cursor);
    if (override) {
      result.push(override);
    } else {
      const custodianMemberId = custodianForDate(schedule, cursor);
      result.push({
        id: `occ_${schedule.id}_${cursor}`,
        familyId: schedule.familyId,
        scheduleId: schedule.id,
        childId: null,
        date: cursor,
        custodianMemberId,
        isOverride: false,
        source: "schedule",
        originalCustodianMemberId: null,
        createdAt: `${cursor}T00:00:00`,
        updatedAt: `${cursor}T00:00:00`,
      });
    }
    cursor = addDaysIso(cursor, 1);
  }
  return result;
}

export function generateHandovers(params: {
  familyId: string;
  occurrences: CustodyOccurrence[];
  childIds: string[];
  createdBy: string;
  time?: string;
  location?: string;
  existing?: Handover[];
}): Handover[] {
  const time = params.time ?? "17:00";
  const location = params.location ?? "School";
  const kept = new Map(
    (params.existing ?? [])
      .filter((item) => !item.cancelledAt)
      .map((item) => [item.date, item]),
  );

  const generated: Handover[] = [];
  for (let i = 0; i < params.occurrences.length - 1; i += 1) {
    const today = params.occurrences[i];
    const tomorrow = params.occurrences[i + 1];
    if (today.custodianMemberId === tomorrow.custodianMemberId) continue;
    const existing = kept.get(today.date);
    if (existing) {
      generated.push({
        ...existing,
        fromMemberId: today.custodianMemberId,
        toMemberId: tomorrow.custodianMemberId,
        pickupMemberId: existing.pickupMemberId ?? tomorrow.custodianMemberId,
        dropoffMemberId: existing.dropoffMemberId ?? today.custodianMemberId,
        readyStatus: existing.readyStatus ?? "open",
        readyAt: existing.readyAt ?? null,
        readyBy: existing.readyBy ?? null,
      });
      continue;
    }
    generated.push({
      id: `han_${today.date}`,
      familyId: params.familyId,
      eventId: null,
      date: today.date,
      time,
      fromMemberId: today.custodianMemberId,
      toMemberId: tomorrow.custodianMemberId,
      childIds: params.childIds,
      location,
      pickupMemberId: tomorrow.custodianMemberId,
      dropoffMemberId: today.custodianMemberId,
      notes: null,
      packingList: [],
      readyStatus: "open",
      readyAt: null,
      readyBy: null,
      cancelledAt: null,
      createdAt: `${today.date}T${time}:00`,
      updatedAt: `${today.date}T${time}:00`,
      createdBy: params.createdBy,
    });
  }
  return generated;
}

export function memberLabel(
  members: FamilyMember[],
  memberId: string,
): string {
  return members.find((member) => member.id === memberId)?.parentLabel ?? "Ouder";
}

export function yearNightCounts(
  occurrences: CustodyOccurrence[],
  year: number,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const occ of occurrences) {
    if (!occ.date.startsWith(String(year))) continue;
    counts[occ.custodianMemberId] = (counts[occ.custodianMemberId] ?? 0) + 1;
  }
  return counts;
}

export { toISODate };
