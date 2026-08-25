import type {
  CalendarEvent,
  CalendarPrivacyMode,
  ChangeRequest,
  ChangeRequestType,
  Child,
  CustodyPattern,
  CustodyScheduleConfig,
  Expense,
  ExpenseCategory,
  FamilyRole,
  FamilySnapshot,
  RecurrenceInterval,
  TaskItem,
  TaskStatus,
  Vacation,
} from "@/lib/domain/types";

export interface CreateFamilyInput {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  familyName: string;
  parentLabel: string;
}

export interface AddChildInput {
  familyId: string;
  createdBy: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

export interface InviteParentInput {
  familyId: string;
  email: string;
  parentLabel: string;
  role?: FamilyRole;
}

export interface SaveScheduleInput {
  familyId: string;
  createdBy: string;
  patternType: CustodyPattern;
  config: CustodyScheduleConfig;
  startsOn: string;
  name: string;
}

export interface CreateChangeRequestInput {
  familyId: string;
  requestedByMemberId: string;
  type: ChangeRequestType;
  targetDate: string;
  message: string;
  payload: Record<string, unknown>;
}

export interface CreateExpenseInput {
  familyId: string;
  createdBy: string;
  description: string;
  amountCents: number;
  date: string;
  childId: string | null;
  category: ExpenseCategory;
  paidByMemberId: string;
  splitPercents: Record<string, number>;
  notes: string | null;
}

export interface CreateTaskInput {
  familyId: string;
  createdBy: string;
  title: string;
  description: string | null;
  childId: string | null;
  assigneeMemberId: string | null;
  dueAt: string | null;
}

export interface CreateEventInput {
  familyId: string;
  createdBy: string;
  title: string;
  category: CalendarEvent["category"];
  startsAt: string;
  endsAt: string;
  location: string | null;
  notes: string | null;
  packingList: string[];
  childIds: string[];
  memberIds: string[];
  allDay?: boolean;
}

export interface FamilyRepository {
  getSnapshot(userId: string): Promise<FamilySnapshot | null>;
  getProfile(userId: string): Promise<FamilySnapshot["currentProfile"] | null>;
  createLocalUser(input: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<{ userId: string }>;
  createFamily(input: CreateFamilyInput): Promise<FamilySnapshot>;
  addChild(input: AddChildInput): Promise<Child>;
  inviteParent(input: InviteParentInput): Promise<{ token: string }>;
  acceptInvite(token: string, userId: string): Promise<FamilySnapshot>;
  saveSchedule(input: SaveScheduleInput): Promise<void>;
  completeOnboarding(userId: string): Promise<void>;
  createChangeRequest(input: CreateChangeRequestInput): Promise<ChangeRequest>;
  respondToChangeRequest(input: {
    id: string;
    actorMemberId: string;
    actorUserId: string;
    decision: "accepted" | "declined" | "alternative_proposed";
    message?: string;
    alternativePayload?: Record<string, unknown>;
  }): Promise<ChangeRequest>;
  createExpense(input: CreateExpenseInput): Promise<Expense>;
  markSplitPaid(splitId: string, actorUserId: string): Promise<void>;
  createTask(input: CreateTaskInput): Promise<TaskItem>;
  updateTaskStatus(taskId: string, status: TaskStatus, actorUserId: string): Promise<void>;
  createEvent(input: CreateEventInput): Promise<CalendarEvent>;
  createVacation(input: {
    familyId: string;
    createdBy: string;
    title: string;
    kind: Vacation["kind"];
    withMemberId: string | null;
    startsOn: string;
    endsOn: string;
    notes: string | null;
  }): Promise<Vacation>;
  respondToVacation(id: string, actorUserId: string, accept: boolean): Promise<void>;
  updateCalendarPrivacy(
    userId: string,
    privacyMode: CalendarPrivacyMode,
  ): Promise<void>;
  addRecurringExpense(input: {
    familyId: string;
    createdBy: string;
    description: string;
    amountCents: number;
    category: ExpenseCategory;
    interval: RecurrenceInterval;
    nextDueDate: string;
    paidByMemberId: string;
    splitPercents: Record<string, number>;
    childId: string | null;
  }): Promise<void>;
  markNotificationsRead(userId: string): Promise<void>;
}
