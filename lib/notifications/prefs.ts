import type { ChannelPrefs, NotificationPrefs } from "@/lib/domain/types";
import type { NotificationType } from "@/lib/notifications/types";

const ON: ChannelPrefs = { inApp: true, email: true, push: false };
const IN_APP: ChannelPrefs = { inApp: true, email: false, push: false };

export function defaultNotificationPrefs(): NotificationPrefs {
  return {
    handoverReminder: ON,
    changeRequest: ON,
    sport: IN_APP,
    taskDue: ON,
    expense: ON,
    payment: ON,
    event: IN_APP,
    activity: IN_APP,
  };
}

export function mergeNotificationPrefs(raw: unknown): NotificationPrefs {
  const defaults = defaultNotificationPrefs();
  if (!raw || typeof raw !== "object") return defaults;
  const input = raw as Partial<Record<keyof NotificationPrefs, Partial<ChannelPrefs>>>;
  const merge = (key: keyof NotificationPrefs): ChannelPrefs => ({
    inApp: input[key]?.inApp ?? defaults[key].inApp,
    email: input[key]?.email ?? defaults[key].email,
    push: input[key]?.push ?? defaults[key].push,
  });
  return {
    handoverReminder: merge("handoverReminder"),
    changeRequest: merge("changeRequest"),
    sport: merge("sport"),
    taskDue: merge("taskDue"),
    expense: merge("expense"),
    payment: merge("payment"),
    event: merge("event"),
    activity: merge("activity"),
  };
}

export function prefKeyForNotificationType(
  type: NotificationType | string,
): keyof NotificationPrefs | null {
  switch (type) {
    case "change_request":
    case "change_request_response":
    case "schedule_changed":
      return "changeRequest";
    case "expense":
      return "expense";
    case "payment":
      return "payment";
    case "task_assigned":
    case "task_completed":
    case "routine_created":
    case "routine_changed":
      return "taskDue";
    case "handover_created":
      return "handoverReminder";
    case "event_created":
    case "vacation":
    case "travel_plan":
      return "event";
    case "needed_item":
    case "child_update":
      return "activity";
    default:
      return null;
  }
}

export function allowsInAppNotification(
  prefs: unknown,
  type: NotificationType | string,
): boolean {
  const key = prefKeyForNotificationType(type);
  if (!key) return true;
  return mergeNotificationPrefs(prefs)[key].inApp;
}
