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
    return message.respondedAt ? `Bevestigd ${formatTime(message.respondedAt)}` : "Bevestigd";
  }
  if (message.status === "declined") return "Afgewezen";
  if (message.readAt) return `Gelezen ${formatTime(message.readAt)}`;
  if (message.status === "read") return `Gelezen ${formatTime(message.sentAt)}`;
  return `${parentName(snapshot, message.authorMemberId)} · ${formatTime(message.sentAt)}`;
}
