export type FamilyRole = "owner" | "parent" | "guardian" | "viewer";
export type MemberStatus = "active" | "invited" | "revoked";
export type PlanId = "free" | "plus" | "family";
export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type EventCategory =
  | "verblijf"
  | "overdracht"
  | "school"
  | "sport"
  | "medisch"
  | "opvang"
  | "vakantie"
  | "verjaardag"
  | "activiteit"
  | "overig";

export type ExpenseCategory =
  | "school"
  | "kleding"
  | "sport"
  | "medisch"
  | "opvang"
  | "activiteit"
  | "zakgeld"
  | "overig";

export type TaskStatus = "open" | "in_progress" | "done";

export type ChangeRequestType =
  | "swap_day"
  | "extra_day"
  | "pickup_time"
  | "location"
  | "vacation"
  | "other";

export type ChangeRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "alternative_proposed"
  | "cancelled";

export type CustodyPattern =
  | "week_on_week_off"
  | "two_two_three"
  | "fixed_weekdays"
  | "custom";

export type DocumentCategory =
  | "identiteit"
  | "school"
  | "medisch"
  | "verzekering"
  | "overeenkomst"
  | "sport"
  | "overig";

export type CalendarProvider = "google" | "microsoft" | "apple_ics";
export type CalendarPrivacyMode = "full" | "busy" | "hidden";

export type RecurrenceInterval = "monthly" | "quarterly" | "yearly" | "custom";

export type NotificationChannel = "in_app" | "email" | "push";

export type VacationKind =
  | "school"
  | "holiday"
  | "own"
  | "with_parent";

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  phone: string | null;
  locale: string;
  timezone: string;
  notificationPrefs: NotificationPrefs;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPrefs {
  handoverReminder: ChannelPrefs;
  changeRequest: ChannelPrefs;
  sport: ChannelPrefs;
  taskDue: ChannelPrefs;
  expense: ChannelPrefs;
  payment: ChannelPrefs;
}

export interface ChannelPrefs {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

export interface FeatureFlags {
  calendarSync: boolean;
  documents: boolean;
  yearOverview: boolean;
  aiAssistant: boolean;
  recurringExpenses: boolean;
}

export interface Family {
  id: string;
  name: string;
  ownerId: string;
  plan: PlanId;
  subscriptionStatus: SubscriptionStatus;
  trialEnd: string | null;
  featureFlags: FeatureFlags;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string | null;
  role: FamilyRole;
  parentLabel: string;
  displayColor: string;
  invitedEmail: string | null;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface Child {
  id: string;
  familyId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  photoUrl: string | null;
  school: string | null;
  className: string | null;
  doctor: string | null;
  dentist: string | null;
  daycare: string | null;
  sports: string[];
  clothingSize: string | null;
  shoeSize: string | null;
  emergencyContacts: EmergencyContact[];
  notes: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ChildGuardian {
  id: string;
  childId: string;
  memberId: string;
  relationship: string;
  isPrimary: boolean;
}

export interface CustodyScheduleConfig {
  parentAMemberId: string;
  parentBMemberId: string;
  /** Monday-based 0–6 for fixed weekdays */
  weekdayMemberIds?: string[];
  /** Repeating member ids for a custom cycle */
  dayCycle?: string[];
  handoverTime?: string;
  handoverLocation?: string;
}

export interface CustodySchedule {
  id: string;
  familyId: string;
  name: string;
  patternType: CustodyPattern;
  config: CustodyScheduleConfig;
  startsOn: string;
  endsOn: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CustodyOccurrence {
  id: string;
  familyId: string;
  scheduleId: string;
  childId: string | null;
  date: string;
  custodianMemberId: string;
  isOverride: boolean;
  source: "schedule" | "change_request" | "manual";
  originalCustodianMemberId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  category: EventCategory;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  packingList: string[];
  childIds: string[];
  memberIds: string[];
  handoverId: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Handover {
  id: string;
  familyId: string;
  eventId: string | null;
  date: string;
  time: string;
  fromMemberId: string;
  toMemberId: string;
  childIds: string[];
  location: string | null;
  pickupMemberId: string | null;
  dropoffMemberId: string | null;
  notes: string | null;
  packingList: string[];
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ChangeRequest {
  id: string;
  familyId: string;
  type: ChangeRequestType;
  status: ChangeRequestStatus;
  requestedByMemberId: string;
  targetDate: string;
  payload: Record<string, unknown>;
  message: string;
  responseMessage: string | null;
  alternativePayload: Record<string, unknown> | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  childId: string | null;
  assigneeMemberId: string | null;
  dueAt: string | null;
  status: TaskStatus;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Expense {
  id: string;
  familyId: string;
  description: string;
  amountCents: number;
  currency: string;
  date: string;
  childId: string | null;
  category: ExpenseCategory;
  paidByMemberId: string;
  receiptUrl: string | null;
  notes: string | null;
  recurringExpenseId: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  memberId: string;
  shareCents: number;
  sharePercent: number;
  paidAt: string | null;
  status: "pending" | "paid" | "waived";
}

export interface RecurringExpense {
  id: string;
  familyId: string;
  description: string;
  amountCents: number;
  currency: string;
  category: ExpenseCategory;
  interval: RecurrenceInterval;
  intervalConfig: Record<string, unknown>;
  nextDueDate: string;
  paidByMemberId: string;
  splitPercents: Record<string, number>;
  childId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface FamilyDocument {
  id: string;
  familyId: string;
  childId: string | null;
  title: string;
  category: DocumentCategory;
  storagePath: string | null;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AppNotification {
  id: string;
  familyId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  channel: NotificationChannel;
  createdAt: string;
}

export interface CalendarConnection {
  id: string;
  userId: string;
  familyId: string;
  provider: CalendarProvider;
  privacyMode: CalendarPrivacyMode;
  status: "disconnected" | "pending" | "connected" | "error";
  syncOutbound: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogEntry {
  id: string;
  familyId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface Invite {
  id: string;
  familyId: string;
  email: string;
  role: FamilyRole;
  parentLabel: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface Vacation {
  id: string;
  familyId: string;
  title: string;
  kind: VacationKind;
  withMemberId: string | null;
  startsOn: string;
  endsOn: string;
  status: "planned" | "requested" | "accepted" | "declined";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface FamilySnapshot {
  family: Family;
  currentProfile: Profile;
  currentMember: FamilyMember;
  profiles: Record<string, Profile>;
  members: FamilyMember[];
  children: Child[];
  guardians: ChildGuardian[];
  schedule: CustodySchedule | null;
  occurrences: CustodyOccurrence[];
  events: CalendarEvent[];
  handovers: Handover[];
  changeRequests: ChangeRequest[];
  tasks: TaskItem[];
  expenses: Expense[];
  splits: ExpenseSplit[];
  recurringExpenses: RecurringExpense[];
  documents: FamilyDocument[];
  notifications: AppNotification[];
  calendarConnections: CalendarConnection[];
  activityLog: ActivityLogEntry[];
  invites: Invite[];
  vacations: Vacation[];
}

export const SESSION_COOKIE = "nestly_session";

export interface SessionPayload {
  userId: string;
  source: "demo" | "local" | "supabase";
}
