import { calendarDateInTimeZone, addDaysIso, matchesDailyBriefSlot } from "@/lib/dates";
import { mergeNotificationPrefs } from "@/lib/notifications/prefs";
import { buildFamilyDayContext, inAppFamliMorgenBody, famliMorgenEntityId } from "@/lib/context/family-day";
import type { FamilyRepository } from "@/lib/data/repository";
import type { FamilySnapshot } from "@/lib/domain/types";

export async function deliverFamliMorgenBriefs(
  repository: FamilyRepository,
  now = new Date(),
): Promise<{ scanned: number; sent: number }> {
  const userIds = await repository.listActiveUserIds();
  let sent = 0;
  for (const userId of userIds) {
    const snapshot = await repository.getSnapshotForCron(userId);
    if (!snapshot) continue;
    const created = await tryDeliverForSnapshot(repository, snapshot, now);
    if (created) sent += 1;
  }
  return { scanned: userIds.length, sent };
}

export async function tryDeliverForSnapshot(
  repository: FamilyRepository,
  snapshot: FamilySnapshot,
  now: Date,
): Promise<boolean> {
  const prefs = mergeNotificationPrefs(snapshot.currentProfile.notificationPrefs).famliMorgen;
  if (!prefs.enabled || !prefs.inApp) return false;
  const tz = snapshot.currentProfile.timezone || "Europe/Amsterdam";
  if (!matchesDailyBriefSlot(now, tz, prefs.time)) return false;
  const today = calendarDateInTimeZone(now, tz);
  const tomorrow = addDaysIso(today, 1);
  const ctx = buildFamilyDayContext(snapshot, tomorrow, now);
  return repository.createSystemNotification({
    familyId: snapshot.family.id,
    userId: snapshot.currentProfile.id,
    actorId: snapshot.currentProfile.id,
    type: "famli_morgen",
    title: "Famli Morgen",
    body: inAppFamliMorgenBody(ctx),
    entityType: "famli_morgen",
    entityId: famliMorgenEntityId(tomorrow),
    payload: {
      events: ctx.counts.events,
      handovers: ctx.counts.handovers,
      packingOpen: ctx.counts.packingOpen,
      tasksOpen: ctx.counts.tasksOpen,
    },
    allowSelf: true,
  });
}
