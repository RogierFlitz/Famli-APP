import { randomUUID } from "crypto";
import type { PackingContext, PackingItem } from "@/lib/domain/types";

export function packingItemsFromLabels(input: {
  familyId: string;
  childIds: string[];
  labels: string[];
  context: PackingContext;
  eventId?: string | null;
  handoverId?: string | null;
  dueOn?: string | null;
  createdBy: string;
  createdAt: string;
  idPrefix?: string;
}): PackingItem[] {
  const items: PackingItem[] = [];
  const seen = new Set<string>();
  for (const childId of input.childIds) {
    for (const raw of input.labels) {
      const label = raw.trim();
      if (!label) continue;
      const key = `${childId}|${label.toLowerCase()}|${input.eventId ?? ""}|${input.handoverId ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: input.idPrefix ? `${input.idPrefix}-${childId}-${label.toLowerCase().replace(/\s+/g, "-")}` : randomUUID(),
        familyId: input.familyId,
        childId,
        label,
        context: input.context,
        eventId: input.eventId ?? null,
        handoverId: input.handoverId ?? null,
        dueOn: input.dueOn ?? null,
        checked: false,
        checkedAt: null,
        checkedBy: null,
        createdBy: input.createdBy,
        createdAt: input.createdAt,
      });
    }
  }
  return items;
}

export function actorFirstName(
  profiles: Record<string, { firstName: string } | undefined>,
  actorId: string,
): string {
  return profiles[actorId]?.firstName?.trim() || "Iemand";
}

export function packingCreateSummary(actorName: string, label: string, handover: boolean): string {
  return handover
    ? `${actorName} voegde ${label} toe aan de overdracht.`
    : `${actorName} voegde ${label} toe.`;
}

export function packingToggleSummary(actorName: string, label: string, checked: boolean): string {
  return checked ? `${actorName} vinkte ${label} af.` : `${actorName} zette ${label} weer open.`;
}

export function handoverReadySummary(actorName: string, toParentLabel: string): string {
  const dest = toParentLabel.trim().toLowerCase();
  return `${actorName} zette de overdracht naar ${dest} op gereed.`;
}
