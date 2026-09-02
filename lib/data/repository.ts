import type {
  AppNotification,
  CalendarEvent,
  CalendarPrivacyMode,
  HandoverReadyStatus,
  PackingContext,
  PackingItem,
  ChangeRequest,
  ChangeRequestType,
  Child,
  ChildSizes,
  ChildUpdate,
  ContextMessage,
  ContextMessageKind,
  ContextResourceType,
  CustodyPattern,
  CustodyScheduleConfig,
  Expense,
  ExpenseCategory,
  FamilyRole,
  FamilySnapshot,
  GuestLinkToken,
  ImportJob,
  ImportSourceKind,
  NeededCategory,
  NeededItem,
  RecurrenceInterval,
  SchoolEventKind,
  TaskItem,
  TaskStatus,
  TravelPlan,
  Vacation,
  MemberRelationType,
  PermissionPreset,
  RoutineAssignMode,
  ShoppingCategory,
  ShoppingItem,
  ShoppingList,
  TaskKind,
} from "@/lib/domain/types";
import type { CalendarFeedStatus } from "@/lib/calendar/ics-export";

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

export interface CreateHandoverInput {
  familyId: string;
  createdBy: string;
  date: string;
  time: string;
  fromMemberId: string;
  toMemberId: string;
  location: string | null;
  packingList: string[];
  notes: string | null;
  childIds: string[];
}

export interface InviteMemberInput {
  familyId: string;
  email: string | null;
  parentLabel: string;
  relationType: MemberRelationType;
  permissionPreset?: PermissionPreset;
  householdId?: string | null;
  linkedParentMemberId?: string | null;
  contactOnly?: boolean;
  phone?: string | null;
  displayColor?: string;
  childIds?: string[];
}

export interface CreateTaskInput {
  familyId: string;
  createdBy: string;
  title: string;
  description: string | null;
  childId: string | null;
  assigneeMemberId: string | null;
  dueAt: string | null;
  kind?: TaskKind;
}

export interface CreateRoutineInput {
  familyId: string;
  createdBy: string;
  title: string;
  description: string | null;
  childId: string | null;
  assigneeMemberId: string | null;
  kind: "routine" | "care";
  weekdays: number[];
  times: string[];
  assignMode?: RoutineAssignMode;
  careLabel?: string | null;
  careInstructions?: string | null;
  packingItems?: string[];
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
  dropoffMemberId?: string | null;
  pickupMemberId?: string | null;
  schoolKind?: SchoolEventKind | null;
  party?: {
    hostName: string;
    forChildId: string;
    address?: string | null;
    contact?: string | null;
    giftBudgetCents?: number | null;
    notes?: string | null;
  } | null;
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
  inviteMember(input: InviteMemberInput): Promise<{ token: string }>;
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
  updateExpense(input: {
    id: string;
    actorUserId: string;
    description?: string;
    amountCents?: number;
    date?: string;
    childId?: string | null;
    category?: ExpenseCategory;
    notes?: string | null;
    splitPercents?: Record<string, number>;
  }): Promise<Expense>;
  voidExpense(id: string, actorUserId: string): Promise<void>;
  settleOpenExpenses(input: {
    familyId: string;
    actorUserId: string;
    actorMemberId: string;
    note?: string | null;
  }): Promise<void>;
  markSplitPaid(splitId: string, actorUserId: string): Promise<void>;
  createTask(input: CreateTaskInput): Promise<TaskItem>;
  createRoutine(input: CreateRoutineInput): Promise<TaskItem>;
  completeRoutineOccurrence(input: {
    occurrenceId: string;
    actorUserId: string;
    actorMemberId: string;
    notes?: string | null;
  }): Promise<void>;
  reopenRoutineOccurrence(occurrenceId: string, actorUserId: string): Promise<void>;
  updateTaskStatus(taskId: string, status: TaskStatus, actorUserId: string): Promise<void>;
  createEvent(input: CreateEventInput): Promise<CalendarEvent>;
  updateEventTransport(input: {
    eventId: string;
    actorUserId: string;
    role: "dropoff" | "pickup";
    memberId: string | null;
  }): Promise<CalendarEvent>;
  listActiveUserIds(): Promise<string[]>;
  getSnapshotForCron(userId: string): Promise<FamilySnapshot | null>;
  createSystemNotification(
    input: import("@/lib/notifications/types").CreateNotificationInput,
  ): Promise<boolean>;
  createHandover(input: CreateHandoverInput): Promise<void>;
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
  syncCalendarConnection(userId: string, provider: import("@/lib/domain/types").CalendarProvider): Promise<void>;
  disconnectCalendar(userId: string, provider: import("@/lib/domain/types").CalendarProvider): Promise<void>;
  connectIcsCalendar(userId: string, familyId: string, icsUrl: string, label?: string): Promise<void>;
  updateGoogleSelectedCalendars(userId: string, calendarIds: string[]): Promise<void>;
  syncStaleCalendars(userId: string): Promise<void>;
  listGoogleCalendarsForUser(userId: string): Promise<Array<{ id: string; name: string; primary?: boolean }>>;
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
  getNotifications(userId: string, limit?: number): Promise<AppNotification[]>;
  markNotificationRead(notificationId: string, userId: string): Promise<void>;
  markNotificationsRead(userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string, userId: string): Promise<void>;
  updateChildSizes(input: {
    childId: string;
    actorUserId: string;
    clothing: string | null;
    shoes: string | null;
    jacket: string | null;
    trousers: string | null;
    sport: string | null;
    helmet: string | null;
    other: string | null;
  }): Promise<ChildSizes>;
  createNeededItem(input: {
    familyId: string;
    createdBy: string;
    childId: string;
    title: string;
    category: NeededCategory;
    size: string | null;
    dueOn: string | null;
    assigneeMemberId: string | null;
    budgetCents: number | null;
    notes: string | null;
    hiddenFromChild: boolean;
    eventId: string | null;
  }): Promise<NeededItem>;
  claimNeededItem(id: string, actorUserId: string, actorMemberId: string): Promise<void>;
  purchaseNeededItem(input: {
    id: string;
    actorUserId: string;
    actorMemberId: string;
    priceCents: number | null;
    receiptUrl: string | null;
  }): Promise<void>;
  unmarkNeededItemBought(id: string, actorUserId: string): Promise<void>;
  neededToExpense(input: {
    id: string;
    actorUserId: string;
    paidByMemberId: string;
    splitPercents: Record<string, number>;
  }): Promise<Expense>;
  createChildUpdate(input: {
    familyId: string;
    childId: string;
    body: string;
    category: string | null;
    authorMemberId: string;
  }): Promise<ChildUpdate>;
  createTravelPlan(input: {
    familyId: string;
    createdBy: string;
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
    outboundNumber: string | null;
    outboundFrom: string | null;
    outboundTo: string | null;
    outboundDeparts: string | null;
    outboundArrives: string | null;
    returnNumber: string | null;
    returnFrom: string | null;
    returnTo: string | null;
    returnDeparts: string | null;
    returnArrives: string | null;
  }): Promise<TravelPlan>;
  uploadExpenseReceipt(input: {
    expenseId: string;
    actorUserId: string;
    data: Buffer;
    mimeType: string;
    originalFilename: string;
  }): Promise<Expense>;
  removeExpenseReceipt(input: {
    expenseId: string;
    actorUserId: string;
  }): Promise<void>;
  getExpenseReceiptViewUrl(input: {
    expenseId: string;
    actorUserId: string;
  }): Promise<string | null>;
  createContextMessage(input: {
    familyId: string;
    authorMemberId: string;
    resourceType: ContextResourceType;
    resourceId: string;
    kind: ContextMessageKind;
    body: string;
  }): Promise<ContextMessage>;
  markContextMessageRead(input: {
    messageId: string;
    readerMemberId: string;
    actorUserId: string;
  }): Promise<void>;
  respondToContextMessage(input: {
    messageId: string;
    responderMemberId: string;
    actorUserId: string;
    decision: "confirmed" | "declined";
    responseBody?: string | null;
  }): Promise<void>;
  handoverCheckIn(input: {
    handoverId: string;
    memberId: string;
    actorUserId: string;
  }): Promise<void>;
  createGuestLink(input: {
    familyId: string;
    createdByMemberId: string;
    label: string;
    changeRequestId: string | null;
    scopes: string[];
    expiresInDays?: number;
  }): Promise<GuestLinkToken>;
  getGuestLinkByToken(token: string): Promise<{ link: GuestLinkToken; snapshot: FamilySnapshot } | null>;
  respondToGuestLink(input: {
    token: string;
    decision: "accepted" | "declined";
    respondedByName: string;
  }): Promise<void>;
  createImportJob(input: {
    familyId: string;
    source: ImportSourceKind;
    fileName?: string;
  }): Promise<ImportJob>;
  getShoppingLists(familyId: string): Promise<ShoppingList[]>;
  createShoppingList(input: {
    familyId: string;
    name: string;
    createdBy: string;
    isDefault?: boolean;
  }): Promise<ShoppingList>;
  renameShoppingList(listId: string, name: string, actorUserId: string): Promise<ShoppingList>;
  deleteShoppingList(listId: string, actorUserId: string): Promise<void>;
  getShoppingItems(listId: string, familyId: string): Promise<ShoppingItem[]>;
  addShoppingItem(input: {
    familyId: string;
    listId: string;
    name: string;
    quantity?: number | null;
    unit?: string | null;
    category?: ShoppingCategory;
    note?: string | null;
    createdBy: string;
  }): Promise<ShoppingItem>;
  updateShoppingItem(input: {
    id: string;
    actorUserId: string;
    name?: string;
    quantity?: number | null;
    unit?: string | null;
    category?: ShoppingCategory;
    note?: string | null;
  }): Promise<ShoppingItem>;
  toggleShoppingItem(itemId: string, actorUserId: string, actorMemberId: string): Promise<ShoppingItem>;
  deleteShoppingItem(itemId: string, actorUserId: string): Promise<void>;
  clearCompletedShoppingItems(listId: string, actorUserId: string): Promise<number>;
  getCalendarFeedStatus(userId: string): Promise<CalendarFeedStatus | null>;
  issueCalendarFeedToken(userId: string, familyId: string): Promise<{ token: string }>;
  revokeCalendarFeedToken(userId: string): Promise<void>;
  getCalendarFeedByToken(token: string): Promise<{ snapshot: FamilySnapshot } | null>;
  touchCalendarFeedAccess(token: string): Promise<void>;
  addChildActivity(input: {
    familyId: string;
    createdBy: string;
    childId: string;
    title: string;
    kind: import("@/lib/domain/types").ChildActivityKind;
    location: string | null;
    weekday: number;
    startTime: string;
    endTime: string | null;
    bringMemberId: string | null;
    pickupMemberId: string | null;
    stayMemberId: string | null;
    contactName: string | null;
    notes: string | null;
  }): Promise<import("@/lib/domain/types").ChildActivity>;
  addChildContact(input: {
    familyId: string;
    createdBy: string;
    childId: string;
    category: import("@/lib/domain/types").ChildContactCategory;
    name: string;
    organization: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
  }): Promise<import("@/lib/domain/types").ChildContact>;
  saveChildSchool(input: {
    familyId: string;
    childId: string;
    name: string;
    className: string;
    teacher: string | null;
    contact: string | null;
    hours: string | null;
    gymDays: string | null;
  }): Promise<void>;
  addFamilyDocument(input: {
    familyId: string;
    createdBy: string;
    childId: string | null;
    title: string;
    category: import("@/lib/domain/types").DocumentCategory;
    data: Buffer;
    mimeType: string;
    originalFilename: string;
  }): Promise<import("@/lib/domain/types").FamilyDocument>;
  familyDocumentViewUrl(documentId: string, actorUserId: string): Promise<string | null>;
  updateNotificationPrefs(
    userId: string,
    prefs: import("@/lib/domain/types").NotificationPrefs,
  ): Promise<void>;
  createPackingItem(input: {
    familyId: string;
    createdBy: string;
    childId: string;
    label: string;
    context?: PackingContext;
    eventId?: string | null;
    handoverId?: string | null;
    dueOn?: string | null;
    checked?: boolean;
  }): Promise<PackingItem>;
  togglePackingItem(itemId: string, actorUserId: string): Promise<PackingItem>;
  markHandoverReady(input: {
    handoverId: string;
    actorUserId: string;
    status?: HandoverReadyStatus;
  }): Promise<void>;
}
