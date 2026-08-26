export type FamilyRole = "owner" | "parent" | "guardian" | "viewer";
export type MemberRelationType =
  | "ouder"
  | "partner"
  | "bonusouder"
  | "opa_oma"
  | "verzorger"
  | "oppas"
  | "anders";
export type PermissionPreset = "practical" | "involved" | "custom";
export type MemberStatus = "active" | "invited" | "revoked";
export type TaskKind = "one_off" | "routine" | "care";
export type RoutineAssignMode = "fixed" | "stay";
export type RoutineOccurrenceStatus = "pending" | "done" | "unregistered";
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
  | "feestje"
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
  | "pickup"
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

export interface MemberPermissions {
  viewCalendar: boolean;
  viewCustody: boolean;
  editCustody: boolean;
  acceptChangeRequests: boolean;
  viewExpenses: boolean;
  editExpenses: boolean;
  viewMedical: boolean;
  viewDocuments: boolean;
  editTasks: boolean;
  completeTasks: boolean;
  manageMembers: boolean;
}

export interface Household {
  id: string;
  familyId: string;
  name: string;
  memberIds: string[];
}

export interface ChildMemberAccess {
  id: string;
  memberId: string;
  childId: string;
  canView: boolean;
  canEdit: boolean;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string | null;
  role: FamilyRole;
  relationType: MemberRelationType;
  permissionPreset: PermissionPreset;
  permissions: MemberPermissions;
  parentLabel: string;
  displayColor: string;
  invitedEmail: string | null;
  status: MemberStatus;
  householdId: string | null;
  contactOnly: boolean;
  linkedParentMemberId: string | null;
  phone: string | null;
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
  passportExpiresOn: string | null;
  passportNumber: string | null;
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

export type SchoolEventKind = "les" | "studiedag" | "schoolreis" | "ouderavond" | "rapport";

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
  dropoffMemberId?: string | null;
  pickupMemberId?: string | null;
  schoolKind?: SchoolEventKind | null;
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
  kind: TaskKind;
  weekdays?: number[];
  times?: string[];
  assignMode?: RoutineAssignMode;
  careLabel?: string | null;
  careInstructions?: string | null;
  packingItems?: string[];
  active?: boolean;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RoutineOccurrence {
  id: string;
  routineId: string;
  familyId: string;
  childId: string | null;
  date: string;
  time: string;
  assigneeMemberId: string | null;
  status: RoutineOccurrenceStatus;
  completedAt: string | null;
  completedByMemberId: string | null;
  notes: string | null;
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
  /** Private storage path (family-documents bucket), not a public URL. */
  receiptStoragePath: string | null;
  receiptFilename: string | null;
  receiptUploadedAt: string | null;
  receiptMimeType: string | null;
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
  travelPlanId?: string | null;
  sensitive?: boolean;
  expiresOn?: string | null;
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
  region?: string | null;
  childIds?: string[];
  stays?: VacationStay[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface VacationStay {
  childId: string;
  from: string;
  to: string;
  memberId: string;
}

export type NeededCategory =
  | "kleding"
  | "schoenen"
  | "school"
  | "sport"
  | "verzorging"
  | "cadeau"
  | "reizen"
  | "overig";

export type NeededStatus = "nodig" | "wordt_geregeld" | "gekocht" | "niet_meer_nodig";

export type NeededItemLocation =
  | "bij_papa"
  | "bij_mama"
  | "op_school"
  | "bij_sportclub"
  | "bij_oma"
  | "bij_kind"
  | "onderweg"
  | "onbekend"
  | "custom";

export type ContextMessageKind = "update" | "confirmation";

export type ContextMessageStatus = "sent" | "read" | "confirmed" | "declined";

export type ContextResourceType =
  | "event"
  | "task"
  | "needed_item"
  | "handover"
  | "expense"
  | "change_request"
  | "travel";

export interface ContextMessage {
  id: string;
  familyId: string;
  resourceType: ContextResourceType;
  resourceId: string;
  kind: ContextMessageKind;
  body: string;
  authorMemberId: string;
  sentAt: string;
  readAt: string | null;
  readByMemberId: string | null;
  status: ContextMessageStatus;
  responseBody: string | null;
  respondedAt: string | null;
  respondedByMemberId: string | null;
}

/** Placeholder — photo/PDF/email import (no parser yet). */
export type ImportSourceKind = "photo" | "pdf" | "email";

export interface ImportJob {
  id: string;
  familyId: string;
  source: ImportSourceKind;
  status: "pending" | "processing" | "done" | "failed";
  createdAt: string;
}

/** External calendar privacy — "Bezet" blocks without details. */
export interface ExternalBusyBlock {
  id: string;
  userId: string;
  startsAt: string;
  endsAt: string;
  label: string;
}

/** Guest link for oma/babysitter / externe ophaalverzoeken. */
export interface GuestLinkToken {
  id: string;
  familyId: string;
  label: string;
  token: string;
  expiresAt: string;
  scopes: string[];
  changeRequestId: string | null;
  createdByMemberId: string;
  createdAt: string;
  response: "accepted" | "declined" | null;
  respondedAt: string | null;
  respondedByName: string | null;
}

/** Manual check-in at handover ("Ik ben er"). */
export interface HandoverCheckIn {
  id: string;
  handoverId: string;
  memberId: string;
  checkedInAt: string;
}

export interface ChildSizes {
  childId: string;
  clothing: string | null;
  shoes: string | null;
  jacket: string | null;
  trousers: string | null;
  sport: string | null;
  helmet: string | null;
  other: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface SizeHistoryEntry {
  id: string;
  childId: string;
  field: string;
  fromValue: string | null;
  toValue: string | null;
  changedAt: string;
  changedBy: string;
}

export interface NeededItem {
  id: string;
  familyId: string;
  childId: string;
  title: string;
  category: NeededCategory;
  size: string | null;
  dueOn: string | null;
  assigneeMemberId: string | null;
  location?: NeededItemLocation | null;
  locationCustom?: string | null;
  budgetCents: number | null;
  status: NeededStatus;
  notes: string | null;
  photoUrl: string | null;
  hiddenFromChild: boolean;
  purchasedAt: string | null;
  purchasedByMemberId: string | null;
  priceCents: number | null;
  receiptUrl: string | null;
  expenseId: string | null;
  eventId: string | null;
  createdAt: string;
  createdBy: string;
}

export interface Party {
  id: string;
  familyId: string;
  eventId: string;
  forChildId: string;
  hostName: string;
  address: string | null;
  contact: string | null;
  rsvp: "pending" | "accepted" | "declined";
  giftNeededItemId: string | null;
  giftBudgetCents: number | null;
  notes: string | null;
}

export interface ChildSchool {
  childId: string;
  name: string;
  className: string;
  teacher: string | null;
  contact: string | null;
  hours: string | null;
  gymDays: string | null;
}

export interface ChildClub {
  id: string;
  childId: string;
  sport: string;
  club: string;
  team: string | null;
  training: string | null;
  matchDay: string | null;
  location: string | null;
  trainer: string | null;
  contact: string | null;
  gear: string[];
}

export interface TravelPlan {
  id: string;
  familyId: string;
  title: string;
  destination: string;
  startsOn: string;
  endsOn: string;
  withMemberId: string;
  childIds: string[];
  transport: string | null;
  stayName: string | null;
  stayAddress: string | null;
  stayContact: string | null;
  bookingRef: string | null;
  notes: string | null;
  createdBy: string;
}

export interface TravelSegment {
  id: string;
  travelPlanId: string;
  kind: "outbound" | "return" | "other";
  carrier: string | null;
  number: string | null;
  fromPlace: string | null;
  toPlace: string | null;
  departsAt: string | null;
  arrivesAt: string | null;
}

export interface ChildUpdate {
  id: string;
  familyId: string;
  childId: string;
  body: string;
  category: string | null;
  authorMemberId: string;
  createdAt: string;
  photoUrl: string | null;
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
  sizes: ChildSizes[];
  sizeHistory: SizeHistoryEntry[];
  neededItems: NeededItem[];
  parties: Party[];
  schools: ChildSchool[];
  clubs: ChildClub[];
  travelPlans: TravelPlan[];
  travelSegments: TravelSegment[];
  childUpdates: ChildUpdate[];
  contextMessages: ContextMessage[];
  importJobs: ImportJob[];
  externalBusyBlocks: ExternalBusyBlock[];
  guestLinkTokens: GuestLinkToken[];
  handoverCheckIns: HandoverCheckIn[];
  households: Household[];
  childMemberAccess: ChildMemberAccess[];
  routineOccurrences: RoutineOccurrence[];
}

export const SESSION_COOKIE = "nestly_session";

export interface SessionPayload {
  userId: string;
  source: "demo" | "local" | "supabase";
}
