import { randomUUID } from "crypto";
import type { AppNotification, FamilySnapshot } from "@/lib/domain/types";
import type { CreateNotificationInput, NotifyFamilyInput } from "@/lib/notifications/types";
import { allowsInAppNotification } from "@/lib/notifications/prefs";

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function isDuplicate(
  notifications: AppNotification[],
  input: Pick<CreateNotificationInput, "userId" | "type" | "entityType" | "entityId">,
): boolean {
  const since = Date.now() - DEDUP_WINDOW_MS;
  return notifications.some(
    (item) =>
      item.userId === input.userId &&
      item.type === input.type &&
      (item.entityType ?? item.type) === input.entityType &&
      (item.entityId ?? null) === input.entityId &&
      new Date(item.createdAt).getTime() >= since,
  );
}

export function pushNotification(
  snap: FamilySnapshot,
  input: CreateNotificationInput,
): AppNotification | null {
  if (input.userId === input.actorId && !input.allowSelf) return null;
  const recipientPrefs = snap.profiles[input.userId]?.notificationPrefs;
  if (!allowsInAppNotification(recipientPrefs, input.type)) return null;
  if (isDuplicate(snap.notifications, input)) return null;

  const notification: AppNotification = {
    id: randomUUID(),
    familyId: input.familyId,
    userId: input.userId,
    actorId: input.actorId,
    type: input.type,
    title: input.title,
    body: input.body,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: {
      entityType: input.entityType,
      entityId: input.entityId,
      ...input.payload,
    },
    readAt: null,
    channel: "in_app",
    createdAt: nowIso(),
  };
  snap.notifications.unshift(notification);
  return notification;
}

export function notifyFamilyMembers(
  snap: FamilySnapshot,
  input: NotifyFamilyInput,
): AppNotification[] {
  const created: AppNotification[] = [];
  const recipients = [...new Set(input.recipientUserIds)].filter((id) => id !== input.actorId);
  for (const userId of recipients) {
    const item = pushNotification(snap, { ...input, userId });
    if (item) created.push(item);
  }
  return created;
}

export function activeMemberUserIds(snap: FamilySnapshot, excludeUserId?: string): string[] {
  return snap.members
    .filter((member) => member.status === "active" && member.userId && member.userId !== excludeUserId)
    .map((member) => member.userId as string);
}

export function memberUserId(snap: FamilySnapshot, memberId: string | null | undefined): string | null {
  if (!memberId) return null;
  return snap.members.find((member) => member.id === memberId)?.userId ?? null;
}
