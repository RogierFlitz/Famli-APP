import type { ActivityLogEntry, FamilySnapshot } from "@/lib/domain/types";

export type FamilyActivityItem = {
  id: string;
  text: string;
  href: string;
  createdAt: string;
};

const MAX_ITEMS = 8;
const MAX_AGE_DAYS = 14;
const MAX_TITLE = 80;

function actorName(snapshot: FamilySnapshot, actorId: string): string {
  return snapshot.profiles[actorId]?.firstName ?? "Iemand";
}

function safeTitle(after: Record<string, unknown> | null): string | null {
  if (!after) return null;
  const title = after.title;
  if (typeof title !== "string") return null;
  const clean = title.trim();
  if (!clean || clean.length > MAX_TITLE) return null;
  return clean;
}

function hrefFor(entry: ActivityLogEntry): string {
  switch (entry.entityType) {
    case "event":
      return `/agenda?focus=${entry.entityId}`;
    case "change_request":
      return `/regelen?tab=verzoeken&id=${entry.entityId}`;
    case "expense":
    case "expense_split":
      return `/kosten?id=${entry.entityId}`;
    case "handover":
      return "/agenda?view=wissels";
    case "packing_item":
      return "/vandaag";
    case "custody_schedule":
      return "/jaaroverzicht";
    default:
      return "/vandaag";
  }
}

function packingSentence(entry: ActivityLogEntry): string | null {
  const summary = entry.after && typeof entry.after.summary === "string" ? entry.after.summary.trim() : "";
  if (!summary || summary.length > 140) return null;
  if (/[{}\[\]]/.test(summary) || /[0-9a-f]{8}-[0-9a-f]{4}-/.test(summary)) return null;
  return summary;
}

function sentence(snapshot: FamilySnapshot, entry: ActivityLogEntry): string | null {
  const who = actorName(snapshot, entry.actorId);
  const title = safeTitle(entry.after);

  switch (entry.action) {
    case "schedule.created":
    case "schedule.saved":
      return `${who} heeft het verblijfsschema bijgewerkt.`;
    case "change_request.created":
      return `${who} stuurde een verzoek.`;
    case "change_request.accepted":
      return `${who} accepteerde een verzoek.`;
    case "change_request.declined":
      return `${who} wees een verzoek af.`;
    case "change_request.alternative_proposed":
      return `${who} stelde een alternatief voor.`;
    case "expense.created":
      return title ? `${who} voegde kosten toe: ${title}.` : `${who} voegde een kostenpost toe.`;
    case "expense.split_paid":
      return `${who} markeerde een deel als verrekend.`;
    case "expense.settled":
      return `${who} heeft openstaande kosten verrekend.`;
    case "event.created":
      return title ? `${who} plande ${title}.` : `${who} voegde een afspraak toe.`;
    case "handover.check_in":
      return `${who} checkte in bij een overdracht.`;
    case "handover.ready":
    case "packing_item.create":
    case "packing_item.check":
    case "packing_item.uncheck":
      return packingSentence(entry);
    case "context_message.create":
      return `${who} deelde een update.`;
    default:
      return null;
  }
}

export function familyActivityFeed(snapshot: FamilySnapshot, now = new Date()): FamilyActivityItem[] {
  const cutoff = now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const items: FamilyActivityItem[] = [];

  for (const entry of snapshot.activityLog) {
    const at = Date.parse(entry.createdAt);
    if (!Number.isFinite(at) || at < cutoff) continue;
    const text = sentence(snapshot, entry);
    if (!text) continue;
    items.push({
      id: entry.id,
      text,
      href: hrefFor(entry),
      createdAt: entry.createdAt,
    });
    if (items.length >= MAX_ITEMS) break;
  }

  return items;
}
