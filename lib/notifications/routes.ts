import type { AppNotification } from "@/lib/domain/types";

function payloadString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function payloadUuid(payload: Record<string, unknown>, key: string): string | null {
  const value = payloadString(payload, key);
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export function notificationEntity(notification: AppNotification): {
  entityType: string;
  entityId: string | null;
  childId: string | null;
} {
  const entityType =
    notification.entityType ??
    payloadString(notification.payload, "entityType") ??
    notification.type;
  const entityId =
    notification.entityId ??
    payloadUuid(notification.payload, "entityId") ??
    payloadUuid(notification.payload, "changeRequestId") ??
    payloadUuid(notification.payload, "taskId") ??
    payloadUuid(notification.payload, "expenseId") ??
    payloadUuid(notification.payload, "handoverId") ??
    payloadUuid(notification.payload, "neededItemId") ??
    payloadUuid(notification.payload, "documentId") ??
    payloadUuid(notification.payload, "childId") ??
    null;
  const childId =
    payloadUuid(notification.payload, "childId") ??
    (entityType === "child" ? entityId : null);
  return { entityType, entityId, childId };
}

/** Resolve in-app navigation target — no dead links. */
export function notificationHref(notification: AppNotification): string {
  const { entityType, entityId, childId } = notificationEntity(notification);

  switch (entityType) {
    case "task":
    case "routine":
      return "/regelen";
    case "child_update":
    case "child":
      return childId ? `/kinderen/${childId}` : "/kinderen";
    case "handover":
      return "/agenda";
    case "needed_item":
      return childId ? `/kinderen/${childId}?tab=nodig` : "/kinderen";
    case "expense":
    case "payment":
      return entityId ? `/kosten?id=${entityId}` : "/kosten";
    case "document":
      return "/documenten";
    case "change_request":
      return entityId ? `/regelen?tab=verzoeken&id=${entityId}` : "/regelen?tab=verzoeken";
    case "event":
    case "vacation":
    case "travel_plan":
    case "schedule":
      return "/agenda";
    case "invite":
      return "/instellingen";
    case "famli_morgen":
      return "/vandaag?dag=morgen";
    default:
      if (notification.type.includes("task") || notification.type.includes("routine")) return "/regelen";
      if (notification.type.includes("expense")) return "/kosten";
      if (notification.type.includes("child")) return childId ? `/kinderen/${childId}` : "/kinderen";
      if (notification.type.includes("change")) return "/regelen?tab=verzoeken";
      if (notification.type.includes("handover")) return "/agenda";
      if (notification.type.includes("invite")) return "/instellingen";
      return "/vandaag";
  }
}
