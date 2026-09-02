import type { ChannelPrefs, FamliMorgenPrefs, NotificationPrefs } from "@/lib/domain/types";
import type { NotificationType } from "@/lib/notifications/types";

const ON: ChannelPrefs = { inApp: true, email: true, push: false };
const IN_APP: ChannelPrefs = { inApp: true, email: false, push: false };

export const NOTIFICATION_CHANNEL_KEYS = [
  "handoverReminder",
  "changeRequest",
  "sport",
  "taskDue",
  "expense",
  "payment",
  "event",
  "activity",
] as const;

export type NotificationChannelKey = (typeof NOTIFICATION_CHANNEL_KEYS)[number];

export function defaultFamliMorgenPrefs(): FamliMorgenPrefs {
  return { enabled: false, time: "20:00", inApp: true, email: false };
}

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
    famliMorgen: defaultFamliMorgenPrefs(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function mergeFamliMorgenPrefs(raw: unknown): FamliMorgenPrefs {
  const defaults = defaultFamliMorgenPrefs();
  if (!isRecord(raw)) return defaults;
  const nested = isRecord(raw.famliMorgen) ? raw.famliMorgen : raw;
  const time = typeof nested.time === "string" && /^\d{1,2}:\d{2}$/.test(nested.time) ? nested.time : defaults.time;
  return {
    enabled: typeof nested.enabled === "boolean" ? nested.enabled : defaults.enabled,
    time,
    inApp: typeof nested.inApp === "boolean" ? nested.inApp : defaults.inApp,
    email: typeof nested.email === "boolean" ? nested.email : defaults.email,
  };
}

export function mergeNotificationPrefs(raw: unknown): NotificationPrefs {
  const defaults = defaultNotificationPrefs();
  if (!raw || typeof raw !== "object") return defaults;
  const input = raw as Partial<Record<NotificationChannelKey, Partial<ChannelPrefs>>> & {
    famliMorgen?: unknown;
  };
  const merge = (key: NotificationChannelKey): ChannelPrefs => ({
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
    famliMorgen: mergeFamliMorgenPrefs(raw),
  };
}

export function prefKeyForNotificationType(
  type: NotificationType | string,
): NotificationChannelKey | null {
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
  const merged = mergeNotificationPrefs(prefs);
  if (type === "famli_morgen") {
    return merged.famliMorgen.enabled && merged.famliMorgen.inApp;
  }
  const key = prefKeyForNotificationType(type);
  if (!key) return true;
  return merged[key].inApp;
}
