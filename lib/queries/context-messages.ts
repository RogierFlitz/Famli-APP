import { formatTime } from "@/lib/dates";
import { parentName } from "@/lib/queries/family-view";
import type { ContextMessage, ContextResourceType, FamilySnapshot } from "@/lib/domain/types";

export function messagesForResource(
  snapshot: FamilySnapshot,
  resourceType: ContextResourceType,
  resourceId: string,
): ContextMessage[] {
  return snapshot.contextMessages
    .filter((item) => item.resourceType === resourceType && item.resourceId === resourceId)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

export function messageStatusLabel(snapshot: FamilySnapshot, message: ContextMessage): string {
  if (message.status === "confirmed") {
    const by = message.respondedByMemberId
      ? parentName(snapshot, message.respondedByMemberId)
      : null;
    const time = message.respondedAt ? formatTime(message.respondedAt) : null;
    if (by && time) return `Bevestigd door ${by} om ${time}`;
    return message.respondedAt ? `Bevestigd ${formatTime(message.respondedAt)}` : "Bevestigd";
  }
  if (message.status === "declined") {
    const by = message.respondedByMemberId
      ? parentName(snapshot, message.respondedByMemberId)
      : null;
    return by ? `Afgewezen door ${by}` : "Afgewezen";
  }
  if (message.readAt && message.readByMemberId) {
    return `Gezien door ${parentName(snapshot, message.readByMemberId)} om ${formatTime(message.readAt)}`;
  }
  if (message.readAt) return `Gelezen ${formatTime(message.readAt)}`;
  if (message.status === "read") return `Gelezen ${formatTime(message.sentAt)}`;
  return `${parentName(snapshot, message.authorMemberId)} · ${formatTime(message.sentAt)}`;
}

export function unreadMessagesForMember(
  snapshot: FamilySnapshot,
  resourceType: ContextResourceType,
  resourceId: string,
  memberId: string,
): ContextMessage[] {
  return messagesForResource(snapshot, resourceType, resourceId).filter(
    (message) =>
      message.authorMemberId !== memberId &&
      !message.readAt &&
      message.status === "sent",
  );
}
