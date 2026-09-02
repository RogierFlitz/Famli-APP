export const NOTIFICATION_TYPES = [
  "invite_sent",
  "invite_accepted",
  "task_assigned",
  "task_completed",
  "routine_created",
  "routine_changed",
  "handover_created",
  "change_request",
  "change_request_response",
  "schedule_changed",
  "needed_item",
  "child_update",
  "expense",
  "payment",
  "document",
  "event_created",
  "vacation",
  "travel_plan",
  "famli_morgen",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface CreateNotificationInput {
  familyId: string;
  userId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  /** Daily brief is addressed to the same user who enabled it. */
  allowSelf?: boolean;
}

export interface NotifyFamilyInput {
  familyId: string;
  actorId: string;
  recipientUserIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
}
