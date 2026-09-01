import { mergeNotificationPrefs } from "@/lib/notifications/prefs";
import { randomUUID } from "crypto";
import {
  assertGuestCanRespondToChangeRequest,
  generateGuestToken,
  guestLinkExpiresAt,
  hashGuestToken,
} from "@/lib/architecture/guest-links";
import {
  calendarFeedTokenHash,
  newCalendarFeedToken,
  type CalendarFeedStatus,
} from "@/lib/calendar/ics-export";
import {
  CalendarFeedNotActivatedError,
  isMissingCalendarFeedTableError,
} from "@/lib/calendar/feed-errors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasServiceRoleKey } from "@/lib/supabase/env";
import { splitAmounts } from "@/lib/money";
import { generateHandovers, generateOccurrences } from "@/lib/custody/generate";
import { addDaysIso, toISODate } from "@/lib/dates";
import { famliColor } from "@/lib/brand/tokens";
import { emptyLifeFields, applyPrivacy } from "@/lib/life/privacy";
import { uniqueById, existingChildRecord } from "@/lib/family/unique";
import {
  memberPermissions,
  parentPermissions,
  presetPermissions,
  roleForRelation,
} from "@/lib/members/permissions";
import { markPastOccurrencesUnregistered } from "@/lib/queries/routines";
import { refreshRoutineOccurrences } from "@/lib/routines/generate";
import {
  fetchActiveMemberUserIds,
  fetchMemberUserId,
  mapNotificationRow,
  notifyFamilyMembers,
} from "@/lib/notifications/supabase";
import { generateInviteToken, inviteExpiresAt } from "@/lib/security/invites";
import {
  deleteExpenseReceiptBlob,
  expenseReceiptStoragePath,
  expenseReceiptViewUrl,
  newExpenseReceiptFilename,
  storeExpenseReceiptBlob,
} from "@/lib/storage/expense-receipts";
import type { CreateFamilyInput, FamilyRepository } from "@/lib/data/repository";
import {
  buildDefaultShoppingList,
  mapShoppingItemRow,
  mapShoppingListRow,
  sortShoppingItems,
  sortShoppingLists,
} from "@/lib/shopping/store-helpers";
import { inferShoppingCategory } from "@/lib/shopping/categories";
import { throwIfMissingShoppingTables } from "@/lib/shopping/errors";
import { mapRpcRowToPersonalEvent, type RawExternalEventRow } from "@/lib/calendar/sanitize";
import {
  disconnectCalendarConnection,
  saveIcsConnection,
  syncCalendarConnection as runCalendarSync,
  syncUserConnections,
} from "@/lib/calendar/sync";
import type {
  CalendarEvent,
  ChangeRequest,
  Child,
  ChildActivity,
  ChildContact,
  ChildMemberAccess,
  ChildSizes,
  ChildUpdate,
  ContextMessage,
  CustodySchedule,
  Expense,
  ExpenseSplit,
  Family,
  FamilyMember,
  FamilySnapshot,
  GuestLinkToken,
  Handover,
  HandoverCheckIn,
  ImportJob,
  NeededItem,
  Party,
  PersonalCalendarEvent,
  Profile,
  RoutineOccurrence,
  ShoppingItem,
  ShoppingList,
  TaskItem,
  TravelPlan,
  TravelSegment,
} from "@/lib/domain/types";

async function db() {
  return createSupabaseServerClient();
}

async function currentUserId(supabase: Awaited<ReturnType<typeof db>>): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function bootstrapDb() {
  return hasServiceRoleKey() ? createSupabaseAdminClient() : null;
}

function toUserFacingDbError(error: unknown): string {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : "Er ging iets mis. Probeer het opnieuw.";

  if (/row-level security|permission denied|42501/i.test(message)) {
    return "Geen toegang om een gezin aan te maken. Probeer opnieuw of neem contact op met support.";
  }
  if (/foreign key|profiles/i.test(message)) {
    return "Je profiel kon niet worden gevonden. Log opnieuw in en probeer het nog eens.";
  }
  return message;
}

async function ensureProfileForUser(
  supabase: Awaited<ReturnType<typeof db>>,
  input: CreateFamilyInput,
) {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", input.userId)
    .maybeSingle();
  if (readError) throw readError;

  if (!existing) {
    const { error } = await supabase.from("profiles").insert({
      id: input.userId,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
    });
    if (error) throw error;
    return;
  }

  const patch: Record<string, string> = {};
  if (input.firstName) patch.first_name = input.firstName;
  if (input.lastName) patch.last_name = input.lastName;
  if (input.email) patch.email = input.email;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("profiles").update(patch).eq("id", input.userId);
  if (error) throw error;
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    email: row.email as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    avatarUrl: (row.avatar_url as string) ?? null,
    phone: (row.phone as string) ?? null,
    locale: (row.locale as string) ?? "nl-NL",
    timezone: (row.timezone as string) ?? "Europe/Amsterdam",
    notificationPrefs: mergeNotificationPrefs(row.notification_prefs),
    onboardingCompletedAt: (row.onboarding_completed_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapContextMessageRow(row: Record<string, unknown>): ContextMessage {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    resourceType: row.resource_type as ContextMessage["resourceType"],
    resourceId: row.resource_id as string,
    kind: row.kind as ContextMessage["kind"],
    body: row.body as string,
    authorMemberId: row.author_member_id as string,
    sentAt: row.sent_at as string,
    readAt: (row.read_at as string) ?? null,
    readByMemberId: (row.read_by_member_id as string) ?? null,
    status: row.status as ContextMessage["status"],
    responseBody: (row.response_body as string) ?? null,
    respondedAt: (row.responded_at as string) ?? null,
    respondedByMemberId: (row.responded_by_member_id as string) ?? null,
  };
}

function mapHandoverCheckInRow(row: Record<string, unknown>): HandoverCheckIn {
  return {
    id: row.id as string,
    handoverId: row.handover_id as string,
    memberId: row.member_id as string,
    checkedInAt: row.checked_in_at as string,
  };
}

function mapImportJobRow(row: Record<string, unknown>): ImportJob {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    source: row.source as ImportJob["source"],
    status: row.status as ImportJob["status"],
    createdAt: row.created_at as string,
  };
}

const GUEST_LINK_COLUMNS =
  "id, family_id, label, expires_at, scopes, change_request_id, created_by_member_id, created_at, response, responded_at, responded_by_name";

async function optionalRows<T extends Record<string, unknown>>(
  query: PromiseLike<{ data: T[] | null; error: { message?: string; code?: string } | null }>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    const text = `${error.message ?? ""} ${error.code ?? ""}`;
    if (/PGRST205|42P01|does not exist|schema cache/i.test(text)) return [];
    throw error;
  }
  return data ?? [];
}

function mapGuestLinkRow(row: Record<string, unknown>, token = ""): GuestLinkToken {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    label: row.label as string,
    token,
    expiresAt: row.expires_at as string,
    scopes: (row.scopes as string[]) ?? [],
    changeRequestId: (row.change_request_id as string) ?? null,
    createdByMemberId: row.created_by_member_id as string,
    createdAt: row.created_at as string,
    response: (row.response as GuestLinkToken["response"]) ?? null,
    respondedAt: (row.responded_at as string) ?? null,
    respondedByName: (row.responded_by_name as string) ?? null,
  };
}

function mapChangeRequestRow(row: Record<string, unknown>): ChangeRequest {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    type: row.type as ChangeRequest["type"],
    status: row.status as ChangeRequest["status"],
    requestedByMemberId: row.requested_by_member_id as string,
    targetDate: row.target_date as string,
    payload: (row.payload as Record<string, unknown>) ?? {},
    message: row.message as string,
    responseMessage: (row.response_message as string) ?? null,
    alternativePayload: (row.alternative_payload as Record<string, unknown>) ?? null,
    resolvedAt: (row.resolved_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapChildSizesRow(row: Record<string, unknown>): ChildSizes {
  return {
    childId: row.child_id as string,
    clothing: (row.clothing as string) ?? null,
    shoes: (row.shoes as string) ?? null,
    jacket: (row.jacket as string) ?? null,
    trousers: (row.trousers as string) ?? null,
    sport: (row.sport as string) ?? null,
    helmet: (row.helmet as string) ?? null,
    other: (row.other as string) ?? null,
    updatedAt: row.updated_at as string,
    updatedBy: row.updated_by as string,
  };
}

function mapNeededItemRow(row: Record<string, unknown>): NeededItem {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    childId: row.child_id as string,
    title: row.title as string,
    category: row.category as NeededItem["category"],
    size: (row.size as string) ?? null,
    dueOn: (row.due_on as string) ?? null,
    assigneeMemberId: (row.assignee_member_id as string) ?? null,
    location: (row.location as NeededItem["location"]) ?? null,
    locationCustom: (row.location_custom as string) ?? null,
    budgetCents: row.budget_cents != null ? Number(row.budget_cents) : null,
    status: row.status as NeededItem["status"],
    notes: (row.notes as string) ?? null,
    photoUrl: (row.photo_url as string) ?? null,
    hiddenFromChild: Boolean(row.hidden_from_child),
    purchasedAt: (row.purchased_at as string) ?? null,
    purchasedByMemberId: (row.purchased_by_member_id as string) ?? null,
    priceCents: row.price_cents != null ? Number(row.price_cents) : null,
    receiptUrl: (row.receipt_url as string) ?? null,
    expenseId: (row.expense_id as string) ?? null,
    eventId: (row.event_id as string) ?? null,
    createdAt: row.created_at as string,
    createdBy: row.created_by as string,
  };
}

function mapPartyRow(row: Record<string, unknown>): Party {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    eventId: row.event_id as string,
    forChildId: row.for_child_id as string,
    hostName: row.host_name as string,
    address: (row.address as string) ?? null,
    contact: (row.contact as string) ?? null,
    rsvp: row.rsvp as Party["rsvp"],
    giftNeededItemId: (row.gift_needed_item_id as string) ?? null,
    giftBudgetCents: row.gift_budget_cents != null ? Number(row.gift_budget_cents) : null,
    notes: (row.notes as string) ?? null,
  };
}

function mapTravelPlanRow(
  row: Record<string, unknown>,
  childIds: string[],
): TravelPlan {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    title: row.title as string,
    destination: row.destination as string,
    startsOn: row.starts_on as string,
    endsOn: row.ends_on as string,
    withMemberId: row.with_member_id as string,
    childIds,
    transport: (row.transport as string) ?? null,
    stayName: (row.stay_name as string) ?? null,
    stayAddress: (row.stay_address as string) ?? null,
    stayContact: (row.stay_contact as string) ?? null,
    bookingRef: (row.booking_ref as string) ?? null,
    notes: (row.notes as string) ?? null,
    createdBy: row.created_by as string,
  };
}

function mapTravelSegmentRow(row: Record<string, unknown>): TravelSegment {
  return {
    id: row.id as string,
    travelPlanId: row.travel_plan_id as string,
    kind: row.kind as TravelSegment["kind"],
    carrier: (row.carrier as string) ?? null,
    number: (row.number as string) ?? null,
    fromPlace: (row.from_place as string) ?? null,
    toPlace: (row.to_place as string) ?? null,
    departsAt: (row.departs_at as string) ?? null,
    arrivesAt: (row.arrives_at as string) ?? null,
  };
}

function mapChildUpdateRow(row: Record<string, unknown>): ChildUpdate {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    childId: row.child_id as string,
    body: row.body as string,
    category: (row.category as string) ?? null,
    authorMemberId: row.author_member_id as string,
    createdAt: row.created_at as string,
    photoUrl: (row.photo_url as string) ?? null,
  };
}

function mapRoutineOccurrenceRow(row: Record<string, unknown>): RoutineOccurrence {
  const time = String(row.time).slice(0, 5);
  return {
    id: row.id as string,
    routineId: row.routine_id as string,
    familyId: row.family_id as string,
    childId: (row.child_id as string) ?? null,
    date: row.date as string,
    time,
    assigneeMemberId: (row.assignee_member_id as string) ?? null,
    status: row.status as RoutineOccurrence["status"],
    completedAt: (row.completed_at as string) ?? null,
    completedByMemberId: (row.completed_by_member_id as string) ?? null,
    notes: (row.notes as string) ?? null,
  };
}

function mapTaskRow(row: Record<string, unknown>): TaskItem {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    childId: (row.child_id as string) ?? null,
    assigneeMemberId: (row.assignee_member_id as string) ?? null,
    dueAt: (row.due_at as string) ?? null,
    status: row.status as TaskItem["status"],
    kind: (row.kind as TaskItem["kind"]) ?? "one_off",
    weekdays: (row.weekdays as number[] | null) ?? undefined,
    times: (row.times as string[] | null) ?? undefined,
    assignMode: (row.assign_mode as TaskItem["assignMode"]) ?? undefined,
    careLabel: (row.care_label as string) ?? null,
    careInstructions: (row.care_instructions as string) ?? null,
    packingItems: (row.packing_items as string[]) ?? undefined,
    active: row.active === false ? false : true,
    attachmentUrl: (row.attachment_url as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: row.created_by as string,
  };
}

async function buildGuestSnapshot(admin: ReturnType<typeof createSupabaseAdminClient>, familyId: string) {
  const { data: familyRow, error: familyError } = await admin
    .from("families")
    .select("*")
    .eq("id", familyId)
    .single();
  if (familyError || !familyRow) return null;

  const { data: memberRows } = await admin.from("family_members").select("*").eq("family_id", familyId);
  const userIds = (memberRows ?? []).map((row) => row.user_id).filter(Boolean) as string[];

  const [profilesRes, requestsRes] = await Promise.all([
    userIds.length
      ? admin.from("profiles").select("*").in("id", userIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    admin.from("change_requests").select("*").eq("family_id", familyId),
  ]);

  const profiles: Record<string, Profile> = {};
  for (const row of profilesRes.data ?? []) {
    profiles[row.id as string] = mapProfile(row);
  }

  const members: FamilyMember[] = (memberRows ?? []).map((row) => ({
    id: row.id,
    familyId: row.family_id,
    userId: row.user_id,
    role: row.role,
    relationType: row.relation_type ?? "ouder",
    permissionPreset: row.permission_preset ?? "custom",
    permissions: row.permissions ?? parentPermissions(),
    parentLabel: row.parent_label,
    displayColor: row.display_color,
    invitedEmail: row.invited_email,
    status: row.status,
    householdId: row.household_id ?? null,
    contactOnly: row.contact_only ?? false,
    linkedParentMemberId: row.linked_parent_member_id ?? null,
    phone: row.phone ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const familyRowData = familyRow;
  const ownerProfile = profiles[familyRowData.owner_id as string];
  const currentMember = members[0];
  if (!currentMember || !ownerProfile) return null;

  const snapshot: FamilySnapshot = {
    family: {
      id: familyRowData.id,
      name: familyRowData.name,
      ownerId: familyRowData.owner_id,
      plan: familyRowData.plan,
      subscriptionStatus: familyRowData.subscription_status,
      trialEnd: familyRowData.trial_end,
      featureFlags: familyRowData.feature_flags,
      createdAt: familyRowData.created_at,
      updatedAt: familyRowData.updated_at,
      createdBy: familyRowData.created_by,
    },
    currentProfile: ownerProfile,
    currentMember,
    profiles,
    members,
    children: [],
    guardians: [],
    schedule: null,
    occurrences: [],
    events: [],
    handovers: [],
    changeRequests: (requestsRes.data ?? []).map(mapChangeRequestRow),
    tasks: [],
    expenses: [],
    splits: [],
    recurringExpenses: [],
    documents: [],
    notifications: [],
    calendarConnections: [],
    activityLog: [],
    invites: [],
    vacations: [],
    ...emptyLifeFields(),
  };

  return snapshot;
}

async function applyGuestAcceptedChange(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  request: ChangeRequest,
) {
  const requestedCustodian =
    typeof request.payload.requestedCustodianMemberId === "string"
      ? request.payload.requestedCustodianMemberId
      : request.requestedByMemberId;

  await admin.from("custody_occurrences").upsert({
    family_id: request.familyId,
    schedule_id: null,
    date: request.targetDate,
    custodian_member_id: requestedCustodian,
    is_override: true,
    source: "change_request",
  });
}

async function buildCalendarExportSnapshot(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  familyId: string,
): Promise<FamilySnapshot | null> {
  const [
    familyRes,
    membersRes,
    childrenRes,
    eventsRes,
    handoversRes,
    vacationsRes,
    childAccessRes,
  ] = await Promise.all([
    admin.from("families").select("*").eq("id", familyId).single(),
    admin.from("family_members").select("*").eq("family_id", familyId),
    admin.from("children").select("*").eq("family_id", familyId),
    admin.from("events").select("*, event_participants(*)").eq("family_id", familyId),
    admin.from("handovers").select("*, handover_children(child_id)").eq("family_id", familyId),
    admin.from("vacations").select("*").eq("family_id", familyId),
    admin.from("child_member_access").select("*").eq("family_id", familyId),
  ]);
  if (familyRes.error || !familyRes.data) return null;

  const memberRows = membersRes.data ?? [];
  const userIds = memberRows.map((row) => row.user_id).filter(Boolean) as string[];
  const { data: profileRows } = userIds.length
    ? await admin.from("profiles").select("*").in("id", userIds)
    : { data: [] as Record<string, unknown>[] };

  const profiles: Record<string, Profile> = {};
  for (const row of profileRows ?? []) {
    const profile = mapProfile(row);
    profiles[profile.id] = profile;
  }

  const members: FamilyMember[] = memberRows.map((row) => ({
    id: row.id,
    familyId: row.family_id,
    userId: row.user_id,
    role: row.role,
    relationType: row.relation_type ?? "ouder",
    permissionPreset: row.permission_preset ?? "custom",
    permissions: row.permissions ?? parentPermissions(),
    parentLabel: row.parent_label,
    displayColor: row.display_color,
    invitedEmail: row.invited_email,
    status: row.status,
    householdId: row.household_id ?? null,
    contactOnly: row.contact_only ?? false,
    linkedParentMemberId: row.linked_parent_member_id ?? null,
    phone: row.phone ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const currentMember = members.find((item) => item.userId === userId);
  const currentProfile = profiles[userId];
  if (!currentMember || !currentProfile) return null;

  const familyRow = familyRes.data;
  const children: Child[] = uniqueById(
    (childrenRes.data ?? []).map((row) => ({
    id: row.id,
    familyId: row.family_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    photoUrl: row.photo_url,
    school: row.school,
    className: row.class_name,
    doctor: row.doctor,
    dentist: row.dentist,
    daycare: row.daycare,
    sports: row.sports ?? [],
    clothingSize: row.clothing_size,
    shoeSize: row.shoe_size,
    passportExpiresOn: row.passport_expires_on ?? null,
    passportNumber: row.passport_number ?? null,
    emergencyContacts: row.emergency_contacts ?? [],
    notes: row.notes,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  })),
  );

  const snapshot: FamilySnapshot = {
    family: {
      id: familyRow.id,
      name: familyRow.name,
      ownerId: familyRow.owner_id,
      plan: familyRow.plan,
      subscriptionStatus: familyRow.subscription_status,
      trialEnd: familyRow.trial_end,
      featureFlags: familyRow.feature_flags,
      createdAt: familyRow.created_at,
      updatedAt: familyRow.updated_at,
      createdBy: familyRow.created_by,
    },
    currentProfile,
    currentMember,
    profiles,
    members,
    children,
    guardians: [],
    schedule: null,
    occurrences: [],
    events: (eventsRes.data ?? []).map((row) => ({
      id: row.id,
      familyId: row.family_id,
      title: row.title,
      description: row.description,
      category: row.category,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      allDay: row.all_day,
      location: row.location,
      notes: row.notes,
      packingList: row.packing_list ?? [],
      childIds: (row.event_participants ?? [])
        .map((p: { child_id: string | null }) => p.child_id)
        .filter(Boolean),
      memberIds: (row.event_participants ?? [])
        .map((p: { member_id: string | null }) => p.member_id)
        .filter(Boolean),
      handoverId: row.handover_id,
      cancelledAt: row.cancelled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    })),
    handovers: (handoversRes.data ?? []).map((row) => ({
      id: row.id,
      familyId: row.family_id,
      eventId: row.event_id,
      date: row.date,
      time: row.time,
      fromMemberId: row.from_member_id,
      toMemberId: row.to_member_id,
      childIds: (row.handover_children ?? []).map((c: { child_id: string }) => c.child_id),
      location: row.location,
      pickupMemberId: row.pickup_member_id,
      dropoffMemberId: row.dropoff_member_id,
      notes: row.notes,
      packingList: row.packing_list ?? [],
      cancelledAt: row.cancelled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    })),
    changeRequests: [],
    tasks: [],
    expenses: [],
    splits: [],
    recurringExpenses: [],
    documents: [],
    notifications: [],
    calendarConnections: [],
    activityLog: [],
    invites: [],
    vacations: (vacationsRes.data ?? []).map((row) => ({
      id: row.id,
      familyId: row.family_id,
      title: row.title,
      kind: row.kind,
      withMemberId: row.with_member_id,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    })),
    ...emptyLifeFields(),
    childMemberAccess: (childAccessRes.data ?? []).map(
      (row): ChildMemberAccess => ({
        id: row.id,
        memberId: row.member_id,
        childId: row.child_id,
        canView: row.can_view,
        canEdit: row.can_edit,
      }),
    ),
  };

  return applyPrivacy(snapshot);
}

export const supabaseRepository: FamilyRepository = {
  async getSnapshot(userId) {
    const supabase = await db();
    const { data: memberships, error } = await supabase
      .from("family_members")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    const membership = memberships?.[0] ?? null;
    if (!membership) return null;

    const familyId = membership.family_id as string;
    const [
      familyRes,
      membersRes,
      childrenRes,
      scheduleRes,
      eventsRes,
      handoversRes,
      requestsRes,
      tasksRes,
      expensesRes,
      splitsRes,
      recurringRes,
      docsRes,
      notesRes,
      connectionsRes,
      logRes,
      invitesRes,
      vacationsRes,
      occurrencesRes,
      guardiansRes,
      contextMessagesRes,
      handoverCheckInsRes,
      importJobsRes,
      guestLinksRes,
      childSizesRes,
      sizeHistoryRes,
      neededItemsRes,
      travelPlansRes,
      travelSegmentsRes,
      childUpdatesRes,
      routineOccurrencesRes,
      partiesRes,
      childAccessRes,
      shoppingListsRes,
      shoppingItemsRes,
    ] = await Promise.all([
      supabase.from("families").select("*").eq("id", familyId).single(),
      supabase.from("family_members").select("*").eq("family_id", familyId),
      supabase.from("children").select("*").eq("family_id", familyId),
      supabase.from("custody_schedules").select("*").eq("family_id", familyId).eq("is_active", true).maybeSingle(),
      supabase.from("events").select("*, event_participants(*)").eq("family_id", familyId),
      supabase.from("handovers").select("*, handover_children(child_id)").eq("family_id", familyId),
      supabase.from("change_requests").select("*").eq("family_id", familyId).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("family_id", familyId),
      supabase.from("expenses").select("*").eq("family_id", familyId),
      supabase.from("expense_splits").select("*"),
      supabase.from("recurring_expenses").select("*").eq("family_id", familyId),
      supabase.from("documents").select("*").eq("family_id", familyId),
      supabase.from("notifications").select("*").eq("family_id", familyId).eq("user_id", userId),
      supabase.from("calendar_connections").select("id, user_id, family_id, provider, privacy_mode, status, sync_outbound, provider_account_email, selected_calendars, last_synced_at, sync_error, created_at, updated_at").eq("family_id", familyId),
      supabase.from("activity_log").select("*").eq("family_id", familyId).order("created_at", { ascending: false }).limit(50),
      supabase.from("invites").select("*").eq("family_id", familyId),
      supabase.from("vacations").select("*").eq("family_id", familyId),
      supabase.from("custody_occurrences").select("*").eq("family_id", familyId),
      supabase.from("child_guardians").select("*"),
      supabase.from("context_messages").select("*").eq("family_id", familyId).order("sent_at", { ascending: false }),
      supabase.from("handover_check_ins").select("*").eq("family_id", familyId),
      supabase.from("import_jobs").select("*").eq("family_id", familyId).order("created_at", { ascending: false }),
      supabase
        .from("guest_link_tokens")
        .select(GUEST_LINK_COLUMNS)
        .eq("family_id", familyId)
        .order("created_at", { ascending: false }),
      supabase.from("child_sizes").select("*").eq("family_id", familyId),
      supabase.from("size_history").select("*").eq("family_id", familyId).order("changed_at", { ascending: false }),
      supabase.from("needed_items").select("*").eq("family_id", familyId).order("created_at", { ascending: false }),
      supabase.from("travel_plans").select("*, travel_plan_children(child_id)").eq("family_id", familyId),
      supabase.from("travel_segments").select("*"),
      supabase.from("child_updates").select("*").eq("family_id", familyId).order("created_at", { ascending: false }),
      supabase.from("routine_occurrences").select("*").eq("family_id", familyId),
      supabase.from("parties").select("*").eq("family_id", familyId),
      supabase.from("child_member_access").select("*").eq("family_id", familyId),
      supabase.from("shopping_lists").select("*").eq("family_id", familyId).order("is_default", { ascending: false }),
      supabase.from("shopping_items").select("*").eq("family_id", familyId).order("created_at", { ascending: false }),
    ]);

    if (familyRes.error) throw familyRes.error;
    const memberRows = membersRes.data ?? [];
    const userIds = memberRows.map((row) => row.user_id).filter(Boolean) as string[];
    const { data: profileRows } = await supabase.from("profiles").select("*").in("id", userIds);
    const profiles: Record<string, Profile> = {};
    for (const row of profileRows ?? []) {
      const profile = mapProfile(row);
      profiles[profile.id] = profile;
    }

    const members: FamilyMember[] = memberRows.map((row) => ({
      id: row.id,
      familyId: row.family_id,
      userId: row.user_id,
      role: row.role,
      relationType: row.relation_type ?? "ouder",
      permissionPreset: row.permission_preset ?? "custom",
      permissions: row.permissions ?? parentPermissions(),
      parentLabel: row.parent_label,
      displayColor: row.display_color,
      invitedEmail: row.invited_email,
      status: row.status,
      householdId: row.household_id ?? null,
      contactOnly: row.contact_only ?? false,
      linkedParentMemberId: row.linked_parent_member_id ?? null,
      phone: row.phone ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const memberByUserId = new Map(
      members.filter((item) => item.userId).map((item) => [item.userId!, item.id] as const),
    );
    const { data: externalRows } = await supabase.rpc("get_family_external_calendar_events", {
      p_family_id: familyId,
    });
    const personalCalendarEvents = (externalRows ?? [])
      .map((row: RawExternalEventRow) =>
        mapRpcRowToPersonalEvent(row, memberByUserId.get(row.user_id) ?? ""),
      )
      .filter((item: PersonalCalendarEvent | null): item is PersonalCalendarEvent => Boolean(item));

    const familyRow = familyRes.data;
    const family: Family = {
      id: familyRow.id,
      name: familyRow.name,
      ownerId: familyRow.owner_id,
      plan: familyRow.plan,
      subscriptionStatus: familyRow.subscription_status,
      trialEnd: familyRow.trial_end,
      featureFlags: familyRow.feature_flags,
      createdAt: familyRow.created_at,
      updatedAt: familyRow.updated_at,
      createdBy: familyRow.created_by,
    };

    const currentMember = members.find((item) => item.userId === userId);
    const currentProfile = profiles[userId];
    if (!currentMember || !currentProfile) return null;

    const children: Child[] = uniqueById(
    (childrenRes.data ?? []).map((row) => ({
      id: row.id,
      familyId: row.family_id,
      firstName: row.first_name,
      lastName: row.last_name,
      dateOfBirth: row.date_of_birth,
      photoUrl: row.photo_url,
      school: row.school,
      className: row.class_name,
      doctor: row.doctor,
      dentist: row.dentist,
      daycare: row.daycare,
      sports: row.sports ?? [],
      clothingSize: row.clothing_size,
      shoeSize: row.shoe_size,
      passportExpiresOn: row.passport_expires_on ?? null,
      passportNumber: row.passport_number ?? null,
      emergencyContacts: row.emergency_contacts ?? [],
      notes: row.notes,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    })),
    );

    const schedule: CustodySchedule | null = scheduleRes.data
      ? {
          id: scheduleRes.data.id,
          familyId: scheduleRes.data.family_id,
          name: scheduleRes.data.name,
          patternType: scheduleRes.data.pattern_type,
          config: scheduleRes.data.config,
          startsOn: scheduleRes.data.starts_on,
          endsOn: scheduleRes.data.ends_on,
          isActive: scheduleRes.data.is_active,
          createdAt: scheduleRes.data.created_at,
          updatedAt: scheduleRes.data.updated_at,
          createdBy: scheduleRes.data.created_by,
        }
      : null;

    const storedOccurrences = (occurrencesRes.data ?? []).map((row) => ({
      id: row.id,
      familyId: row.family_id,
      scheduleId: row.schedule_id,
      childId: row.child_id,
      date: row.date,
      custodianMemberId: row.custodian_member_id,
      isOverride: row.is_override,
      source: row.source,
      originalCustodianMemberId: row.original_custodian_member_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const occurrences = schedule
      ? generateOccurrences({
          schedule,
          from: addDaysIso(toISODate(new Date()), -60),
          to: addDaysIso(toISODate(new Date()), 180),
          existing: storedOccurrences,
        })
      : storedOccurrences;

    const events: CalendarEvent[] = (eventsRes.data ?? []).map((row) => ({
      id: row.id,
      familyId: row.family_id,
      title: row.title,
      description: row.description,
      category: row.category,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      allDay: row.all_day,
      location: row.location,
      notes: row.notes,
      packingList: row.packing_list ?? [],
      childIds: (row.event_participants ?? [])
        .map((p: { child_id: string | null }) => p.child_id)
        .filter(Boolean),
      memberIds: (row.event_participants ?? [])
        .map((p: { member_id: string | null }) => p.member_id)
        .filter(Boolean),
      handoverId: row.handover_id,
      cancelledAt: row.cancelled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    }));

    const handovers: Handover[] = (handoversRes.data ?? []).map((row) => ({
      id: row.id,
      familyId: row.family_id,
      eventId: row.event_id,
      date: row.date,
      time: row.time,
      fromMemberId: row.from_member_id,
      toMemberId: row.to_member_id,
      childIds: (row.handover_children ?? []).map((c: { child_id: string }) => c.child_id),
      location: row.location,
      pickupMemberId: row.pickup_member_id,
      dropoffMemberId: row.dropoff_member_id,
      notes: row.notes,
      packingList: row.packing_list ?? [],
      cancelledAt: row.cancelled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    }));

    const expenseIds = (expensesRes.data ?? []).map((row) => row.id);
    const splits: ExpenseSplit[] = (splitsRes.data ?? [])
      .filter((row) => expenseIds.includes(row.expense_id))
      .map((row) => ({
        id: row.id,
        expenseId: row.expense_id,
        memberId: row.member_id,
        shareCents: row.share_cents,
        sharePercent: Number(row.share_percent),
        paidAt: row.paid_at,
        status: row.status,
      }));

    const expenses: Expense[] = (expensesRes.data ?? []).map((row) => ({
      id: row.id,
      familyId: row.family_id,
      description: row.description,
      amountCents: row.amount_cents,
      currency: row.currency,
      date: row.date,
      childId: row.child_id,
      category: row.category,
      paidByMemberId: row.paid_by_member_id,
      receiptStoragePath: row.receipt_url,
      receiptFilename: row.receipt_filename,
      receiptUploadedAt: row.receipt_uploaded_at,
      receiptMimeType: row.receipt_mime_type,
      notes: row.notes,
      recurringExpenseId: row.recurring_expense_id,
      voidedAt: row.voided_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    }));

    const [activityRows, contactRows, schoolRows] = await Promise.all([
      optionalRows(supabase.from("child_activities").select("*").eq("family_id", familyId)),
      optionalRows(supabase.from("child_contacts").select("*").eq("family_id", familyId)),
      optionalRows(supabase.from("child_schools").select("*").eq("family_id", familyId)),
    ]);

    const snapshot: FamilySnapshot = {
      family,
      currentProfile,
      currentMember,
      profiles,
      members,
      children,
      guardians: (guardiansRes.data ?? [])
        .filter((row) => children.some((child) => child.id === row.child_id))
        .map((row) => ({
          id: row.id,
          childId: row.child_id,
          memberId: row.member_id,
          relationship: row.relationship,
          isPrimary: row.is_primary,
        })),
      schedule,
      occurrences,
      events,
      handovers: handovers.length
        ? handovers
        : schedule
          ? generateHandovers({
              familyId,
              occurrences,
              childIds: children.map((child) => child.id),
              createdBy: family.createdBy,
              time: schedule.config.handoverTime,
              location: schedule.config.handoverLocation,
            })
          : [],
      changeRequests: (requestsRes.data ?? []).map((row) => ({
        id: row.id,
        familyId: row.family_id,
        type: row.type,
        status: row.status,
        requestedByMemberId: row.requested_by_member_id,
        targetDate: row.target_date,
        payload: row.payload ?? {},
        message: row.message,
        responseMessage: row.response_message,
        alternativePayload: row.alternative_payload,
        resolvedAt: row.resolved_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      tasks: (tasksRes.data ?? []).map(mapTaskRow),
      expenses,
      splits,
      recurringExpenses: (recurringRes.data ?? []).map((row) => ({
        id: row.id,
        familyId: row.family_id,
        description: row.description,
        amountCents: row.amount_cents,
        currency: row.currency,
        category: row.category,
        interval: row.interval,
        intervalConfig: row.interval_config ?? {},
        nextDueDate: row.next_due_date,
        paidByMemberId: row.paid_by_member_id,
        splitPercents: row.split_percents ?? {},
        childId: row.child_id,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
      })),
      documents: (docsRes.data ?? []).map((row) => ({
        id: row.id,
        familyId: row.family_id,
        childId: row.child_id,
        title: row.title,
        category: row.category,
        storagePath: row.storage_path,
        mimeType: row.mime_type,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
      })),
      notifications: (notesRes.data ?? []).map((row) => ({
        id: row.id,
        familyId: row.family_id,
        userId: row.user_id,
        actorId: row.actor_id ?? null,
        type: row.type,
        title: row.title,
        body: row.body,
        entityType: row.entity_type ?? null,
        entityId: row.entity_id ?? null,
        payload: row.payload ?? {},
        readAt: row.read_at,
        channel: row.channel,
        createdAt: row.created_at,
      })),
      calendarConnections: (connectionsRes.data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        familyId: row.family_id,
        provider: row.provider,
        privacyMode: row.privacy_mode,
        status: row.status,
        syncOutbound: row.sync_outbound,
        providerAccountEmail: row.provider_account_email ?? null,
        selectedCalendars: row.selected_calendars ?? [],
        lastSyncedAt: row.last_synced_at ?? null,
        syncError: row.sync_error ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      activityLog: (logRes.data ?? []).map((row) => ({
        id: row.id,
        familyId: row.family_id,
        actorId: row.actor_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        before: row.before,
        after: row.after,
        createdAt: row.created_at,
      })),
      invites: (invitesRes.data ?? []).map((row) => ({
        id: row.id,
        familyId: row.family_id,
        email: row.email,
        role: row.role,
        parentLabel: row.parent_label,
        token: row.token,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        createdAt: row.created_at,
      })),
      vacations: (vacationsRes.data ?? []).map((row) => ({
        id: row.id,
        familyId: row.family_id,
        title: row.title,
        kind: row.kind,
        withMemberId: row.with_member_id,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
      })),
      sizes: (childSizesRes.data ?? []).map(mapChildSizesRow),
      sizeHistory: (sizeHistoryRes.data ?? []).map((row) => ({
        id: row.id,
        childId: row.child_id,
        field: row.field,
        fromValue: row.from_value ?? null,
        toValue: row.to_value ?? null,
        changedAt: row.changed_at,
        changedBy: row.changed_by,
      })),
      neededItems: (neededItemsRes.data ?? []).map(mapNeededItemRow),
      parties: (partiesRes.data ?? []).map(mapPartyRow),
      travelPlans: (travelPlansRes.data ?? []).map((row) =>
        mapTravelPlanRow(
          row,
          (row.travel_plan_children ?? []).map((c: { child_id: string }) => c.child_id),
        ),
      ),
      travelSegments: (travelSegmentsRes.data ?? [])
        .filter((row) =>
          (travelPlansRes.data ?? []).some((plan) => plan.id === row.travel_plan_id),
        )
        .map(mapTravelSegmentRow),
      childUpdates: (childUpdatesRes.data ?? []).map(mapChildUpdateRow),
      childMemberAccess: (childAccessRes.data ?? []).map(
        (row): ChildMemberAccess => ({
          id: row.id,
          memberId: row.member_id,
          childId: row.child_id,
          canView: row.can_view,
          canEdit: row.can_edit,
        }),
      ),
      routineOccurrences: (routineOccurrencesRes.data ?? []).map(mapRoutineOccurrenceRow),
      shoppingLists: (shoppingListsRes.data ?? []).map(mapShoppingListRow),
      shoppingItems: (shoppingItemsRes.data ?? []).map(mapShoppingItemRow),
      childActivities: activityRows.map((row) => ({
        id: row.id as string,
        familyId: row.family_id as string,
        childId: row.child_id as string,
        title: row.title as string,
        kind: row.kind as ChildActivity["kind"],
        location: (row.location as string) ?? null,
        weekday: Number(row.weekday),
        startTime: row.start_time as string,
        endTime: (row.end_time as string) ?? null,
        bringMemberId: (row.bring_member_id as string) ?? null,
        pickupMemberId: (row.pickup_member_id as string) ?? null,
        stayMemberId: (row.stay_member_id as string) ?? null,
        contactName: (row.contact_name as string) ?? null,
        notes: (row.notes as string) ?? null,
        active: Boolean(row.active),
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        createdBy: row.created_by as string,
      })),
      childContacts: contactRows.map((row) => ({
        id: row.id as string,
        familyId: row.family_id as string,
        childId: row.child_id as string,
        category: row.category as ChildContact["category"],
        name: row.name as string,
        organization: (row.organization as string) ?? null,
        phone: (row.phone as string) ?? null,
        email: (row.email as string) ?? null,
        address: (row.address as string) ?? null,
        notes: (row.notes as string) ?? null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        createdBy: row.created_by as string,
      })),
      schools: schoolRows.map((row) => ({
        childId: row.child_id as string,
        name: (row.name as string) ?? "",
        className: (row.class_name as string) ?? "",
        teacher: (row.teacher as string) ?? null,
        contact: (row.contact as string) ?? null,
        hours: (row.hours as string) ?? null,
        gymDays: (row.gym_days as string) ?? null,
      })),
      clubs: [],
      households: [],
      externalBusyBlocks: [],
      personalCalendarEvents,
      contextMessages: (contextMessagesRes.data ?? []).map(mapContextMessageRow),
      handoverCheckIns: (handoverCheckInsRes.data ?? []).map(mapHandoverCheckInRow),
      importJobs: (importJobsRes.data ?? []).map(mapImportJobRow),
      guestLinkTokens: (guestLinksRes.data ?? []).map((row) => mapGuestLinkRow(row)),
    };

    refreshRoutineOccurrences(snapshot);
    markPastOccurrencesUnregistered(snapshot);

    return applyPrivacy(snapshot);
  },

  async getProfile(userId) {
    const supabase = await db();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    return data ? mapProfile(data) : null;
  },

  async createLocalUser() {
    throw new Error("Gebruik Supabase Auth voor nieuwe accounts.");
  },

  async createFamily(input) {
    const supabase = await db();
    await ensureProfileForUser(supabase, input);

    const familyId = randomUUID();
    const memberId = randomUUID();
    const familyRow = {
      id: familyId,
      name: input.familyName,
      owner_id: input.userId,
      plan: "free",
      subscription_status: "trialing",
      trial_end: new Date(Date.now() + 14 * 86400000).toISOString(),
      feature_flags: {
        calendarSync: false,
        documents: true,
        yearOverview: true,
        aiAssistant: false,
        recurringExpenses: false,
      },
      created_by: input.userId,
    };
    const memberRow = {
      id: memberId,
      family_id: familyId,
      user_id: input.userId,
      role: "owner",
      parent_label: input.parentLabel,
      display_color: famliColor.parent1,
      invited_email: input.email,
      status: "active",
    };

    const writer = bootstrapDb() ?? supabase;
    const { error: familyError } = await writer.from("families").insert(familyRow);
    if (familyError) throw new Error(toUserFacingDbError(familyError));

    const { error: memberError } = await writer.from("family_members").insert(memberRow);
    if (memberError) throw new Error(toUserFacingDbError(memberError));

    const defaultList = buildDefaultShoppingList({
      familyId,
      createdBy: input.userId,
    });
    const { error: listError } = await writer.from("shopping_lists").insert({
      id: defaultList.id,
      family_id: defaultList.familyId,
      name: defaultList.name,
      is_default: true,
      created_by: defaultList.createdBy,
    });
    if (listError) throw new Error(toUserFacingDbError(listError));

    const snap = await this.getSnapshot(input.userId);
    if (!snap) {
      throw new Error(
        "Gezin is aangemaakt maar kon niet worden geladen. Vernieuw de pagina en probeer opnieuw.",
      );
    }
    return snap;
  },

  async addChild(input) {
    const supabase = await db();
    const existingSnap = await this.getSnapshot(input.createdBy);
    const already = existingSnap ? existingChildRecord(existingSnap.children, input.firstName, input.dateOfBirth) : undefined;
    if (already) return already;
    const id = randomUUID();
    const { error } = await supabase.from("children").insert({
      id,
      family_id: input.familyId,
      first_name: input.firstName,
      last_name: input.lastName,
      date_of_birth: input.dateOfBirth,
      color: famliColor.child,
      created_by: input.createdBy,
    });
    if (error) throw error;
    const snap = await this.getSnapshot(input.createdBy);
    const child = snap?.children.find((item) => item.id === id);
    if (!child) throw new Error("Kind kon niet worden opgeslagen.");
    return child;
  },

  async inviteParent(input) {
    const supabase = await db();
    const token = randomUUID();
    const actorId = (await currentUserId(supabase)) ?? "";
    const { error } = await supabase.from("invites").insert({
      family_id: input.familyId,
      email: input.email,
      role: input.role ?? "parent",
      parent_label: input.parentLabel,
      token,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    });
    if (error) throw error;
    await supabase.from("family_members").insert({
      family_id: input.familyId,
      user_id: null,
      role: input.role ?? "parent",
      parent_label: input.parentLabel,
      display_color: famliColor.parent2,
      invited_email: input.email,
      status: "invited",
    });
    if (actorId) {
      const recipients = await fetchActiveMemberUserIds(supabase, input.familyId, actorId);
      await notifyFamilyMembers(supabase, {
        familyId: input.familyId,
        actorId,
        recipientUserIds: recipients,
        type: "invite_sent",
        title: "Nieuwe uitnodiging verstuurd",
        body: `${input.parentLabel} (${input.email}) is uitgenodigd voor het gezin.`,
        entityType: "invite",
        entityId: token,
        payload: { email: input.email },
      });
    }
    return { token };
  },

  async acceptInvite(token, userId) {
    const supabase = await db();
    const { data: invite, error } = await supabase.from("invites").select("*").eq("token", token).maybeSingle();
    if (error) throw error;
    if (!invite) throw new Error("Uitnodiging is ongeldig of verlopen.");
    await supabase.from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
    await supabase
      .from("family_members")
      .update({ user_id: userId, status: "active" })
      .eq("family_id", invite.family_id)
      .eq("invited_email", invite.email);
    const recipients = await fetchActiveMemberUserIds(supabase, invite.family_id, userId);
    await notifyFamilyMembers(supabase, {
      familyId: invite.family_id,
      actorId: userId,
      recipientUserIds: recipients,
      type: "invite_accepted",
      title: "Uitnodiging geaccepteerd",
      body: `${invite.parent_label} is toegetreden tot het gezin.`,
      entityType: "invite",
      entityId: invite.id,
      payload: { parentLabel: invite.parent_label },
    });
    const snap = await this.getSnapshot(userId);
    if (!snap) throw new Error("Gezin kon niet worden geladen.");
    return snap;
  },

  async saveSchedule(input) {
    const supabase = await db();
    const { error } = await supabase.from("custody_schedules").upsert({
      family_id: input.familyId,
      name: input.name,
      pattern_type: input.patternType,
      config: input.config,
      starts_on: input.startsOn,
      is_active: true,
      created_by: input.createdBy,
    });
    if (error) throw error;
    const recipients = await fetchActiveMemberUserIds(supabase, input.familyId, input.createdBy);
    await notifyFamilyMembers(supabase, {
      familyId: input.familyId,
      actorId: input.createdBy,
      recipientUserIds: recipients,
      type: "schedule_changed",
      title: "Omgangsregeling gewijzigd",
      body: `Het rooster "${input.name}" is bijgewerkt.`,
      entityType: "schedule",
      entityId: input.familyId,
    });
  },

  async completeOnboarding(userId) {
    const supabase = await db();
    await supabase
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", userId);
  },

  async createChangeRequest(input) {
    const supabase = await db();
    const id = randomUUID();
    const { data, error } = await supabase
      .from("change_requests")
      .insert({
        id,
        family_id: input.familyId,
        type: input.type,
        status: "pending",
        requested_by_member_id: input.requestedByMemberId,
        target_date: input.targetDate,
        payload: input.payload,
        message: input.message,
      })
      .select("*")
      .single();
    if (error) throw error;
    const { data: requester } = await supabase
      .from("family_members")
      .select("user_id")
      .eq("id", input.requestedByMemberId)
      .maybeSingle();
    const actorId = requester?.user_id ?? (await currentUserId(supabase)) ?? "";
    const recipients = await fetchActiveMemberUserIds(supabase, input.familyId, actorId);
    await notifyFamilyMembers(supabase, {
      familyId: input.familyId,
      actorId,
      recipientUserIds: recipients,
      type: "change_request",
      title: "Nieuw verzoek",
      body: input.message || "Er staat een verzoek voor je klaar.",
      entityType: "change_request",
      entityId: id,
      payload: { changeRequestId: id },
    });
    return {
      id: data.id,
      familyId: data.family_id,
      type: data.type,
      status: data.status,
      requestedByMemberId: data.requested_by_member_id,
      targetDate: data.target_date,
      payload: data.payload ?? {},
      message: data.message,
      responseMessage: data.response_message,
      alternativePayload: data.alternative_payload,
      resolvedAt: data.resolved_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } satisfies ChangeRequest;
  },

  async respondToChangeRequest(input) {
    const supabase = await db();
    const patch: Record<string, unknown> = {
      status: input.decision,
      response_message: input.message ?? null,
      resolved_at: input.decision === "alternative_proposed" ? null : new Date().toISOString(),
    };
    if (input.alternativePayload) patch.alternative_payload = input.alternativePayload;
    const { data, error } = await supabase
      .from("change_requests")
      .update(patch)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    if (input.decision === "accepted") {
      const requestedCustodian =
        typeof data.payload?.requestedCustodianMemberId === "string"
          ? data.payload.requestedCustodianMemberId
          : data.requested_by_member_id;
      const acceptedDate =
        (typeof input.alternativePayload?.targetDate === "string" && input.alternativePayload.targetDate) ||
        (typeof data.alternative_payload?.targetDate === "string" && data.alternative_payload.targetDate) ||
        data.target_date;
      await supabase.from("custody_occurrences").upsert({
        family_id: data.family_id,
        schedule_id: null,
        date: acceptedDate,
        custodian_member_id: requestedCustodian,
        is_override: true,
        source: "change_request",
      });
    }
    await supabase.from("activity_log").insert({
      family_id: data.family_id,
      actor_id: input.actorUserId,
      action: `change_request.${input.decision}`,
      entity_type: "change_request",
      entity_id: data.id,
      before: null,
      after: { status: data.status },
    });
    const responseTitle =
      input.decision === "accepted"
        ? "Verzoek geaccepteerd"
        : input.decision === "declined"
          ? "Kan niet"
          : "Alternatief voorgesteld";
    const recipients = await fetchActiveMemberUserIds(supabase, data.family_id, input.actorUserId);
    await notifyFamilyMembers(supabase, {
      familyId: data.family_id,
      actorId: input.actorUserId,
      recipientUserIds: recipients,
      type: "change_request_response",
      title: responseTitle,
      body: input.message || data.message,
      entityType: "change_request",
      entityId: data.id,
      payload: { changeRequestId: data.id, decision: input.decision },
    });
    return {
      id: data.id,
      familyId: data.family_id,
      type: data.type,
      status: data.status,
      requestedByMemberId: data.requested_by_member_id,
      targetDate: data.target_date,
      payload: data.payload ?? {},
      message: data.message,
      responseMessage: data.response_message,
      alternativePayload: data.alternative_payload,
      resolvedAt: data.resolved_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async createExpense(input) {
    const supabase = await db();
    const id = randomUUID();
    const { error } = await supabase.from("expenses").insert({
      id,
      family_id: input.familyId,
      description: input.description,
      amount_cents: input.amountCents,
      date: input.date,
      child_id: input.childId,
      category: input.category,
      paid_by_member_id: input.paidByMemberId,
      notes: input.notes,
      created_by: input.createdBy,
    });
    if (error) throw error;
    const shares = splitAmounts(input.amountCents, input.splitPercents);
    await supabase.from("expense_splits").insert(
      Object.entries(shares).map(([memberId, shareCents]) => ({
        expense_id: id,
        member_id: memberId,
        share_cents: shareCents,
        share_percent: input.splitPercents[memberId],
        paid_at: memberId === input.paidByMemberId ? new Date().toISOString() : null,
        status: memberId === input.paidByMemberId ? "paid" : "pending",
      })),
    );
    const pendingMemberIds = Object.entries(input.splitPercents)
      .filter(([memberId]) => memberId !== input.paidByMemberId)
      .map(([memberId]) => memberId);
    const recipientUserIds: string[] = [];
    for (const memberId of pendingMemberIds) {
      const uid = await fetchMemberUserId(supabase, memberId);
      if (uid) recipientUserIds.push(uid);
    }
    await notifyFamilyMembers(supabase, {
      familyId: input.familyId,
      actorId: input.createdBy,
      recipientUserIds,
      type: "expense",
      title: "Nieuwe kostenpost",
      body: input.description,
      entityType: "expense",
      entityId: id,
      payload: { expenseId: id, childId: input.childId },
    });
    return {
      id,
      familyId: input.familyId,
      description: input.description,
      amountCents: input.amountCents,
      currency: "EUR",
      date: input.date,
      childId: input.childId,
      category: input.category,
      paidByMemberId: input.paidByMemberId,
      receiptStoragePath: null,
      receiptFilename: null,
      receiptUploadedAt: null,
      receiptMimeType: null,
      notes: input.notes,
      recurringExpenseId: null,
      voidedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: input.createdBy,
    };
  },

  async markSplitPaid(splitId) {
    const supabase = await db();
    await supabase
      .from("expense_splits")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", splitId);
  },

  async updateExpense(input) {
    const supabase = await db();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.description !== undefined) patch.description = input.description;
    if (input.date !== undefined) patch.date = input.date;
    if (input.childId !== undefined) patch.child_id = input.childId;
    if (input.category !== undefined) patch.category = input.category;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.amountCents !== undefined) patch.amount_cents = input.amountCents;
    const { data, error } = await supabase.from("expenses").update(patch).eq("id", input.id).select("*").single();
    if (error) throw error;
    if (input.amountCents !== undefined && input.splitPercents) {
      await supabase.from("expense_splits").delete().eq("expense_id", input.id);
      const shares = splitAmounts(input.amountCents, input.splitPercents);
      await supabase.from("expense_splits").insert(
        Object.entries(shares).map(([memberId, shareCents]) => ({
          expense_id: input.id,
          member_id: memberId,
          share_cents: shareCents,
          share_percent: input.splitPercents![memberId],
          paid_at: memberId === data.paid_by_member_id ? new Date().toISOString() : null,
          status: memberId === data.paid_by_member_id ? "paid" : "pending",
        })),
      );
    }
    return {
      id: data.id,
      familyId: data.family_id,
      description: data.description,
      amountCents: data.amount_cents,
      currency: data.currency,
      date: data.date,
      childId: data.child_id,
      category: data.category,
      paidByMemberId: data.paid_by_member_id,
      receiptStoragePath: data.receipt_url,
      receiptFilename: data.receipt_filename,
      receiptUploadedAt: data.receipt_uploaded_at,
      receiptMimeType: data.receipt_mime_type,
      notes: data.notes,
      recurringExpenseId: data.recurring_expense_id,
      voidedAt: data.voided_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
    };
  },

  async voidExpense(id) {
    const supabase = await db();
    const { error } = await supabase
      .from("expenses")
      .update({ voided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async settleOpenExpenses(input) {
    const supabase = await db();
    const { data: expenses } = await supabase
      .from("expenses")
      .select("id")
      .eq("family_id", input.familyId)
      .is("voided_at", null);
    const ids = (expenses ?? []).map((row) => row.id as string);
    if (ids.length) {
      await supabase
        .from("expense_splits")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .in("expense_id", ids)
        .eq("status", "pending");
    }
    await supabase.from("expense_settlements").insert({
      family_id: input.familyId,
      from_member_id: input.actorMemberId,
      to_member_id: input.actorMemberId,
      amount_cents: 0,
      note: input.note,
      created_by: input.actorUserId,
    });
    const recipientUserIds = await fetchActiveMemberUserIds(supabase, input.familyId);
    await notifyFamilyMembers(supabase, {
      familyId: input.familyId,
      actorId: input.actorUserId,
      recipientUserIds: recipientUserIds.filter((id) => id !== input.actorUserId),
      type: "payment",
      title: "Kosten verrekend",
      body: input.note || "Openstaande kosten zijn afgesloten.",
      entityType: "expense",
      entityId: input.familyId,
    });
  },

  async createTask(input) {
    const supabase = await db();
    const id = randomUUID();
    const { error } = await supabase.from("tasks").insert({
      id,
      family_id: input.familyId,
      title: input.title,
      description: input.description,
      child_id: input.childId,
      assignee_member_id: input.assigneeMemberId,
      due_at: input.dueAt,
      status: "open",
      created_by: input.createdBy,
    });
    if (error) throw error;
    if (input.assigneeMemberId) {
      const assigneeUserId = await fetchMemberUserId(supabase, input.assigneeMemberId);
      if (assigneeUserId) {
        await notifyFamilyMembers(supabase, {
          familyId: input.familyId,
          actorId: input.createdBy,
          recipientUserIds: [assigneeUserId],
          type: "task_assigned",
          title: "Nieuwe taak toegewezen",
          body: input.title,
          entityType: "task",
          entityId: id,
          payload: { taskId: id, childId: input.childId },
        });
      }
    }
    return {
      id,
      familyId: input.familyId,
      title: input.title,
      description: input.description,
      childId: input.childId,
      assigneeMemberId: input.assigneeMemberId,
      dueAt: input.dueAt,
      status: "open",
      kind: "one_off",
      attachmentUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: input.createdBy,
    } satisfies TaskItem;
  },

  async updateTaskStatus(taskId, status, actorUserId) {
    const supabase = await db();
    const { data: task } = await supabase
      .from("tasks")
      .select("family_id, title, created_by, assignee_member_id, child_id")
      .eq("id", taskId)
      .maybeSingle();
    await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (task && status === "done" && actorUserId) {
      const recipientUserIds: string[] = [];
      if (task.created_by && task.created_by !== actorUserId) recipientUserIds.push(task.created_by);
      const assigneeUserId = await fetchMemberUserId(supabase, task.assignee_member_id);
      if (assigneeUserId && assigneeUserId !== actorUserId && !recipientUserIds.includes(assigneeUserId)) {
        recipientUserIds.push(assigneeUserId);
      }
      await notifyFamilyMembers(supabase, {
        familyId: task.family_id,
        actorId: actorUserId,
        recipientUserIds,
        type: "task_completed",
        title: "Taak afgerond",
        body: task.title,
        entityType: "task",
        entityId: taskId,
        payload: { taskId, childId: task.child_id },
      });
    }
  },

  async createEvent(input) {
    const supabase = await db();
    const id = randomUUID();
    const { error } = await supabase.from("events").insert({
      id,
      family_id: input.familyId,
      title: input.title,
      category: input.category,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      all_day: Boolean(input.allDay),
      location: input.location,
      notes: input.notes,
      packing_list: input.packingList,
      created_by: input.createdBy,
    });
    if (error) throw error;
    const participants = [
      ...input.childIds.map((childId) => ({ event_id: id, child_id: childId, member_id: null })),
      ...input.memberIds.map((memberId) => ({ event_id: id, child_id: null, member_id: memberId })),
    ];
    if (participants.length) await supabase.from("event_participants").insert(participants);

    if (input.party) {
      const giftId = randomUUID();
      await supabase.from("needed_items").insert({
        id: giftId,
        family_id: input.familyId,
        child_id: input.party.forChildId,
        title: `Cadeau ${input.party.hostName}`,
        category: "cadeau",
        due_on: input.startsAt.slice(0, 10),
        budget_cents: input.party.giftBudgetCents,
        status: "nodig",
        notes: input.party.notes,
        hidden_from_child: true,
        event_id: id,
        created_by: input.createdBy,
      });
      await supabase.from("parties").insert({
        family_id: input.familyId,
        event_id: id,
        for_child_id: input.party.forChildId,
        host_name: input.party.hostName,
        address: input.party.address ?? null,
        contact: input.party.contact ?? null,
        rsvp: "pending",
        gift_needed_item_id: giftId,
        gift_budget_cents: input.party.giftBudgetCents ?? null,
        notes: input.party.notes ?? null,
      });
    }

    if (input.childIds.length > 0) {
      const recipients = await fetchActiveMemberUserIds(supabase, input.familyId, input.createdBy);
      await notifyFamilyMembers(supabase, {
        familyId: input.familyId,
        actorId: input.createdBy,
        recipientUserIds: recipients,
        type: "event_created",
        title: "Nieuwe afspraak met kinderen",
        body: input.title,
        entityType: "event",
        entityId: id,
        payload: { childIds: input.childIds },
      });
    }

    return {
      id,
      familyId: input.familyId,
      title: input.title,
      description: null,
      category: input.category,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      allDay: Boolean(input.allDay),
      location: input.location,
      notes: input.notes,
      packingList: input.packingList,
      childIds: input.childIds,
      memberIds: input.memberIds,
      handoverId: null,
      dropoffMemberId: input.dropoffMemberId ?? null,
      pickupMemberId: input.pickupMemberId ?? null,
      schoolKind: input.schoolKind ?? null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: input.createdBy,
    };
  },

  async createHandover(input) {
    const supabase = await db();
    const handoverId = randomUUID();
    const eventId = randomUUID();
    const starts = `${input.date}T${input.time}:00`;
    await supabase.from("events").insert({
      id: eventId,
      family_id: input.familyId,
      title: "Wisselmoment",
      category: "overdracht",
      starts_at: starts,
      ends_at: starts,
      location: input.location,
      notes: input.notes,
      packing_list: input.packingList,
      created_by: input.createdBy,
    });
    if (input.childIds.length) {
      await supabase.from("event_participants").insert(
        input.childIds.map((childId) => ({ event_id: eventId, child_id: childId, member_id: null })),
      );
    }
    await supabase.from("event_participants").insert([
      { event_id: eventId, child_id: null, member_id: input.fromMemberId },
      { event_id: eventId, child_id: null, member_id: input.toMemberId },
    ]);
    await supabase.from("handovers").insert({
      id: handoverId,
      family_id: input.familyId,
      event_id: eventId,
      date: input.date,
      time: input.time,
      from_member_id: input.fromMemberId,
      to_member_id: input.toMemberId,
      location: input.location,
      pickup_member_id: input.toMemberId,
      dropoff_member_id: input.fromMemberId,
      notes: input.notes,
      packing_list: input.packingList,
      created_by: input.createdBy,
    });
    if (input.childIds.length) {
      await supabase.from("handover_children").insert(
        input.childIds.map((childId) => ({ handover_id: handoverId, child_id: childId })),
      );
    }
    const toUserId = await fetchMemberUserId(supabase, input.toMemberId);
    if (toUserId) {
      await notifyFamilyMembers(supabase, {
        familyId: input.familyId,
        actorId: input.createdBy,
        recipientUserIds: [toUserId],
        type: "handover_created",
        title: "Nieuw wisselmoment",
        body: `Wissel op ${input.date} om ${input.time}`,
        entityType: "handover",
        entityId: handoverId,
        payload: { handoverId, childIds: input.childIds },
      });
    }
  },

  async createVacation(input) {
    const supabase = await db();
    const id = randomUUID();
    await supabase.from("vacations").insert({
      id,
      family_id: input.familyId,
      title: input.title,
      kind: input.kind,
      with_member_id: input.withMemberId,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      status: "requested",
      notes: input.notes,
      created_by: input.createdBy,
    });
    const recipients = await fetchActiveMemberUserIds(supabase, input.familyId, input.createdBy);
    await notifyFamilyMembers(supabase, {
      familyId: input.familyId,
      actorId: input.createdBy,
      recipientUserIds: recipients,
      type: "vacation",
      title: "Vakantieverzoek",
      body: input.title,
      entityType: "vacation",
      entityId: id,
    });
    return {
      id,
      familyId: input.familyId,
      title: input.title,
      kind: input.kind,
      withMemberId: input.withMemberId,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      status: "requested",
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: input.createdBy,
    };
  },

  async respondToVacation(id, actorUserId, accept) {
    const supabase = await db();
    const { data: vacation } = await supabase
      .from("vacations")
      .select("family_id, title, created_by")
      .eq("id", id)
      .maybeSingle();
    await supabase
      .from("vacations")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", id);
    if (vacation?.created_by && vacation.created_by !== actorUserId) {
      await notifyFamilyMembers(supabase, {
        familyId: vacation.family_id,
        actorId: actorUserId,
        recipientUserIds: [vacation.created_by],
        type: "vacation",
        title: accept ? "Vakantie geaccepteerd" : "Vakantie afgewezen",
        body: vacation.title,
        entityType: "vacation",
        entityId: id,
        payload: { decision: accept ? "accepted" : "declined" },
      });
    }
  },

  async updateCalendarPrivacy(userId, privacyMode) {
    const supabase = await db();
    const { data: existing, error: readError } = await supabase
      .from("calendar_connections")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (readError) throw readError;

    if (existing) {
      const { error } = await supabase
        .from("calendar_connections")
        .update({ privacy_mode: privacyMode, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
      return;
    }

    const { data: membership, error: memberError } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (memberError) throw memberError;
    if (!membership) throw new Error("Geen gezin gevonden.");

    const { error } = await supabase.from("calendar_connections").insert({
      user_id: userId,
      family_id: membership.family_id,
      provider: "microsoft",
      privacy_mode: privacyMode,
      status: "disconnected",
      sync_outbound: false,
    });
    if (error) throw error;
  },

  async syncCalendarConnection(userId, provider) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("calendar_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error("Geen agenda-koppeling gevonden.");
    await runCalendarSync(data.id);
  },

  async disconnectCalendar(userId, provider) {
    await disconnectCalendarConnection(userId, provider);
  },

  async connectIcsCalendar(userId, familyId, icsUrl, label) {
    const connectionId = await saveIcsConnection({ userId, familyId, icsUrl, label });
    await runCalendarSync(connectionId);
  },

  async updateGoogleSelectedCalendars(userId, calendarIds) {
    const supabase = await db();
    const { error } = await supabase
      .from("calendar_connections")
      .update({ selected_calendars: calendarIds.map((id) => ({ id, name: id })) })
      .eq("user_id", userId)
      .eq("provider", "google");
    if (error) throw error;
    await this.syncCalendarConnection(userId, "google");
  },

  async syncStaleCalendars(userId) {
    await syncUserConnections(userId, { staleOnly: true });
  },

  async listGoogleCalendarsForUser(userId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("calendar_connections")
      .select("id, access_token_encrypted, refresh_token_encrypted, token_expires_at, provider")
      .eq("user_id", userId)
      .eq("provider", "google")
      .eq("status", "connected")
      .maybeSingle();
    if (error) throw error;
    if (!data) return [];
    const { ensureAccessToken, mapConnectionRow } = await import("@/lib/calendar/sync");
    const { listGoogleCalendars } = await import("@/lib/calendar/providers/google");
    const token = await ensureAccessToken(mapConnectionRow(data));
    if (!token) return [];
    return listGoogleCalendars(token);
  },

  async addRecurringExpense(input) {
    const supabase = await db();
    await supabase.from("recurring_expenses").insert({
      family_id: input.familyId,
      description: input.description,
      amount_cents: input.amountCents,
      category: input.category,
      interval: input.interval,
      next_due_date: input.nextDueDate,
      paid_by_member_id: input.paidByMemberId,
      split_percents: input.splitPercents,
      child_id: input.childId,
      created_by: input.createdBy,
    });
  },

  async getNotifications(userId, limit = 50) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => mapNotificationRow(row as Record<string, unknown>));
  },

  async markNotificationRead(notificationId, userId) {
    const supabase = await db();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw error;
  },

  async markNotificationsRead(userId) {
    const supabase = await db();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
  },

  async markAllNotificationsRead(userId) {
    return this.markNotificationsRead(userId);
  },

  async deleteNotification(notificationId, userId) {
    const supabase = await db();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async updateChildSizes(input) {
    const supabase = await db();
    const { data: child } = await supabase
      .from("children")
      .select("id, family_id")
      .eq("id", input.childId)
      .maybeSingle();
    if (!child) throw new Error("Kind niet gevonden.");

    const fields = {
      clothing: input.clothing,
      shoes: input.shoes,
      jacket: input.jacket,
      trousers: input.trousers,
      sport: input.sport,
      helmet: input.helmet,
      other: input.other,
    } as const;
    const stamp = new Date().toISOString();

    const { data: current } = await supabase
      .from("child_sizes")
      .select("*")
      .eq("child_id", input.childId)
      .maybeSingle();

    if (current) {
      const historyRows = [];
      for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
        if ((current[key] ?? "") !== (fields[key] ?? "")) {
          historyRows.push({
            child_id: input.childId,
            family_id: child.family_id,
            field: key,
            from_value: current[key],
            to_value: fields[key],
            changed_at: stamp,
            changed_by: input.actorUserId,
          });
        }
      }
      if (historyRows.length) {
        await supabase.from("size_history").insert(historyRows);
      }
    }

    const { data: updated, error } = await supabase
      .from("child_sizes")
      .upsert({
        child_id: input.childId,
        family_id: child.family_id,
        ...fields,
        updated_at: stamp,
        updated_by: input.actorUserId,
      })
      .select("*")
      .single();
    if (error || !updated) throw error ?? new Error("Maten konden niet worden opgeslagen.");

    await supabase
      .from("children")
      .update({
        clothing_size: input.clothing,
        shoe_size: input.shoes,
        updated_at: stamp,
      })
      .eq("id", input.childId);

    return mapChildSizesRow(updated);
  },

  async createNeededItem(input) {
    const supabase = await db();
    const id = randomUUID();
    const status = input.assigneeMemberId ? "wordt_geregeld" : "nodig";
    const { data, error } = await supabase
      .from("needed_items")
      .insert({
        id,
        family_id: input.familyId,
        child_id: input.childId,
        title: input.title,
        category: input.category,
        size: input.size,
        due_on: input.dueOn,
        assignee_member_id: input.assigneeMemberId,
        budget_cents: input.budgetCents,
        status,
        notes: input.notes,
        hidden_from_child: input.hiddenFromChild,
        event_id: input.eventId,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Item kon niet worden opgeslagen.");
    const recipientUserIds: string[] = [];
    if (input.assigneeMemberId) {
      const assigneeUserId = await fetchMemberUserId(supabase, input.assigneeMemberId);
      if (assigneeUserId) recipientUserIds.push(assigneeUserId);
    } else {
      const others = await fetchActiveMemberUserIds(supabase, input.familyId, input.createdBy);
      recipientUserIds.push(...others);
    }
    await notifyFamilyMembers(supabase, {
      familyId: input.familyId,
      actorId: input.createdBy,
      recipientUserIds,
      type: "needed_item",
      title: "Nieuw nodig-item",
      body: input.title,
      entityType: "needed_item",
      entityId: id,
      payload: { neededItemId: id, childId: input.childId },
    });
    return mapNeededItemRow(data);
  },

  async claimNeededItem(id, _actorUserId, actorMemberId) {
    const supabase = await db();
    await supabase
      .from("needed_items")
      .update({ assignee_member_id: actorMemberId, status: "wordt_geregeld" })
      .eq("id", id);
  },

  async purchaseNeededItem(input) {
    const supabase = await db();
    const { data: item } = await supabase.from("needed_items").select("assignee_member_id").eq("id", input.id).maybeSingle();
    const update: Record<string, unknown> = {
      status: "gekocht",
      purchased_at: new Date().toISOString(),
      purchased_by_member_id: input.actorMemberId,
      price_cents: input.priceCents,
      receipt_url: input.receiptUrl,
    };
    if (!item?.assignee_member_id) update.assignee_member_id = input.actorMemberId;
    await supabase.from("needed_items").update(update).eq("id", input.id);
  },

  async unmarkNeededItemBought(id, _actorUserId) {
    const supabase = await db();
    const { data: item } = await supabase.from("needed_items").select("status, expense_id, assignee_member_id").eq("id", id).maybeSingle();
    if (!item || item.status !== "gekocht") return;
    if (item.expense_id) throw new Error("Kan niet terugzetten: al gekoppeld aan kosten.");
    await supabase
      .from("needed_items")
      .update({
        status: item.assignee_member_id ? "wordt_geregeld" : "nodig",
        purchased_at: null,
        purchased_by_member_id: null,
        price_cents: null,
        receipt_url: null,
      })
      .eq("id", id);
  },

  async neededToExpense(input) {
    const supabase = await db();
    const { data: item, error: fetchError } = await supabase
      .from("needed_items")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (fetchError || !item) throw new Error("Item niet gevonden.");

    const amount = item.price_cents ?? item.budget_cents ?? 0;
    const created = new Date().toISOString();
    const expenseCategory =
      item.category === "school" || item.category === "sport" || item.category === "kleding"
        ? item.category
        : "overig";
    const expenseId = randomUUID();

    const { error: expenseError } = await supabase.from("expenses").insert({
      id: expenseId,
      family_id: item.family_id,
      description: item.title,
      amount_cents: amount,
      date: created.slice(0, 10),
      child_id: item.child_id,
      category: expenseCategory,
      paid_by_member_id: input.paidByMemberId,
      notes: item.notes,
      created_by: input.actorUserId,
    });
    if (expenseError) throw expenseError;

    const shares = splitAmounts(amount, input.splitPercents);
    await supabase.from("expense_splits").insert(
      Object.entries(shares).map(([memberId, shareCents]) => ({
        expense_id: expenseId,
        member_id: memberId,
        share_cents: shareCents,
        share_percent: input.splitPercents[memberId],
        paid_at: memberId === input.paidByMemberId ? created : null,
        status: memberId === input.paidByMemberId ? "paid" : "pending",
      })),
    );

    const itemUpdate: Record<string, unknown> = { expense_id: expenseId };
    if (item.status !== "gekocht") {
      itemUpdate.status = "gekocht";
      itemUpdate.purchased_at = created;
      itemUpdate.purchased_by_member_id = input.paidByMemberId;
      itemUpdate.price_cents = amount;
    }
    await supabase.from("needed_items").update(itemUpdate).eq("id", input.id);

    return {
      id: expenseId,
      familyId: item.family_id,
      description: item.title,
      amountCents: amount,
      currency: "EUR",
      date: created.slice(0, 10),
      childId: item.child_id,
      category: expenseCategory,
      paidByMemberId: input.paidByMemberId,
      receiptStoragePath: null,
      receiptFilename: null,
      receiptUploadedAt: null,
      receiptMimeType: null,
      notes: item.notes,
      recurringExpenseId: null,
      voidedAt: null,
      createdAt: created,
      updatedAt: created,
      createdBy: input.actorUserId,
    };
  },

  async createChildUpdate(input) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("child_updates")
      .insert({
        family_id: input.familyId,
        child_id: input.childId,
        body: input.body,
        category: input.category,
        author_member_id: input.authorMemberId,
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Update kon niet worden opgeslagen.");
    const { data: author } = await supabase
      .from("family_members")
      .select("user_id")
      .eq("id", input.authorMemberId)
      .maybeSingle();
    const actorId = author?.user_id ?? (await currentUserId(supabase)) ?? "";
    const recipients = await fetchActiveMemberUserIds(supabase, input.familyId, actorId);
    await notifyFamilyMembers(supabase, {
      familyId: input.familyId,
      actorId,
      recipientUserIds: recipients,
      type: "child_update",
      title: "Update over kind",
      body: input.body.slice(0, 120),
      entityType: "child_update",
      entityId: data.id,
      payload: { childId: input.childId, childUpdateId: data.id },
    });
    return mapChildUpdateRow(data);
  },

  async createTravelPlan(input) {
    const supabase = await db();
    const planId = randomUUID();
    const { error: planError } = await supabase.from("travel_plans").insert({
      id: planId,
      family_id: input.familyId,
      title: input.title,
      destination: input.destination,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      with_member_id: input.withMemberId,
      transport: input.transport,
      stay_name: input.stayName,
      stay_address: input.stayAddress,
      stay_contact: input.stayContact,
      booking_ref: input.bookingRef,
      notes: input.notes,
      created_by: input.createdBy,
    });
    if (planError) throw planError;

    if (input.childIds.length) {
      await supabase.from("travel_plan_children").insert(
        input.childIds.map((childId) => ({ travel_plan_id: planId, child_id: childId })),
      );
    }

    const segments: TravelSegment[] = [];
    if (input.outboundNumber || input.outboundDeparts) {
      const segId = randomUUID();
      await supabase.from("travel_segments").insert({
        id: segId,
        travel_plan_id: planId,
        kind: "outbound",
        number: input.outboundNumber,
        from_place: input.outboundFrom,
        to_place: input.outboundTo,
        departs_at: input.outboundDeparts,
        arrives_at: input.outboundArrives,
      });
      segments.push({
        id: segId,
        travelPlanId: planId,
        kind: "outbound",
        carrier: null,
        number: input.outboundNumber,
        fromPlace: input.outboundFrom,
        toPlace: input.outboundTo,
        departsAt: input.outboundDeparts,
        arrivesAt: input.outboundArrives,
      });
    }
    if (input.returnNumber || input.returnDeparts) {
      const segId = randomUUID();
      await supabase.from("travel_segments").insert({
        id: segId,
        travel_plan_id: planId,
        kind: "return",
        number: input.returnNumber,
        from_place: input.returnFrom,
        to_place: input.returnTo,
        departs_at: input.returnDeparts,
        arrives_at: input.returnArrives,
      });
      segments.push({
        id: segId,
        travelPlanId: planId,
        kind: "return",
        carrier: null,
        number: input.returnNumber,
        fromPlace: input.returnFrom,
        toPlace: input.returnTo,
        departsAt: input.returnDeparts,
        arrivesAt: input.returnArrives,
      });
    }

    const eventId = randomUUID();
    await supabase.from("events").insert({
      id: eventId,
      family_id: input.familyId,
      title: input.title,
      description: input.destination,
      category: "vakantie",
      starts_at: `${input.startsOn}T00:00:00`,
      ends_at: `${input.endsOn}T23:59:00`,
      all_day: true,
      location: input.destination,
      notes: input.notes,
      created_by: input.createdBy,
    });
    if (input.childIds.length) {
      await supabase.from("event_participants").insert(
        input.childIds.map((childId) => ({ event_id: eventId, child_id: childId, member_id: null })),
      );
    }
    await supabase.from("event_participants").insert({
      event_id: eventId,
      child_id: null,
      member_id: input.withMemberId,
    });

    const recipients = await fetchActiveMemberUserIds(supabase, input.familyId, input.createdBy);
    await notifyFamilyMembers(supabase, {
      familyId: input.familyId,
      actorId: input.createdBy,
      recipientUserIds: recipients,
      type: "travel_plan",
      title: "Nieuw reisplan",
      body: `${input.title} — ${input.destination}`,
      entityType: "travel_plan",
      entityId: planId,
      payload: { childIds: input.childIds },
    });

    return {
      id: planId,
      familyId: input.familyId,
      title: input.title,
      destination: input.destination,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      withMemberId: input.withMemberId,
      childIds: input.childIds,
      transport: input.transport,
      stayName: input.stayName,
      stayAddress: input.stayAddress,
      stayContact: input.stayContact,
      bookingRef: input.bookingRef,
      notes: input.notes,
      createdBy: input.createdBy,
    };
  },

  async inviteMember(input) {
    const supabase = await db();
    const relationType = input.relationType;
    const preset = input.permissionPreset ?? (relationType === "partner" ? "involved" : "practical");
    const role = roleForRelation(relationType);
    const memberId = randomUUID();
    const token = input.email && !input.contactOnly ? generateInviteToken() : "";

    const { error: memberError } = await supabase.from("family_members").insert({
      id: memberId,
      family_id: input.familyId,
      user_id: null,
      role,
      relation_type: relationType,
      permission_preset: preset,
      permissions: presetPermissions(preset, relationType),
      parent_label: input.parentLabel,
      display_color: input.displayColor ?? famliColor.parent2,
      invited_email: input.email,
      status: input.contactOnly ? "active" : "invited",
      household_id: input.householdId ?? null,
      contact_only: input.contactOnly ?? false,
      linked_parent_member_id: input.linkedParentMemberId ?? null,
      phone: input.phone ?? null,
    });
    if (memberError) throw memberError;

    if (input.childIds?.length) {
      await supabase.from("child_member_access").insert(
        input.childIds.map((childId) => ({
          family_id: input.familyId,
          member_id: memberId,
          child_id: childId,
          can_view: true,
          can_edit: preset === "involved",
        })),
      );
    }

    if (input.email && !input.contactOnly) {
      await supabase.from("invites").insert({
        family_id: input.familyId,
        email: input.email,
        role,
        parent_label: input.parentLabel,
        token,
        expires_at: inviteExpiresAt().toISOString(),
      });
    }

    const actorId = (await currentUserId(supabase)) ?? "";
    if (actorId && !input.contactOnly) {
      const recipients = await fetchActiveMemberUserIds(supabase, input.familyId, actorId);
      await notifyFamilyMembers(supabase, {
        familyId: input.familyId,
        actorId,
        recipientUserIds: recipients,
        type: "invite_sent",
        title: "Nieuwe uitnodiging",
        body: `${input.parentLabel}${input.email ? ` (${input.email})` : ""} is uitgenodigd.`,
        entityType: "invite",
        entityId: memberId,
        payload: { email: input.email, memberId },
      });
    }

    return { token };
  },

  async createRoutine(input) {
    const supabase = await db();
    const id = randomUUID();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        id,
        family_id: input.familyId,
        title: input.title,
        description: input.description,
        child_id: input.childId,
        assignee_member_id: input.assigneeMemberId,
        status: "open",
        kind: input.kind,
        weekdays: input.weekdays,
        times: input.times,
        assign_mode: input.assignMode ?? "stay",
        care_label: input.careLabel ?? null,
        care_instructions: input.careInstructions ?? null,
        packing_items: input.packingItems ?? [],
        active: true,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Routine kon niet worden opgeslagen.");
    const recipientUserIds: string[] = [];
    if (input.assigneeMemberId) {
      const assigneeUserId = await fetchMemberUserId(supabase, input.assigneeMemberId);
      if (assigneeUserId) recipientUserIds.push(assigneeUserId);
    }
    const others = await fetchActiveMemberUserIds(supabase, input.familyId, input.createdBy);
    for (const uid of others) {
      if (!recipientUserIds.includes(uid)) recipientUserIds.push(uid);
    }
    await notifyFamilyMembers(supabase, {
      familyId: input.familyId,
      actorId: input.createdBy,
      recipientUserIds,
      type: "routine_created",
      title: input.kind === "care" ? "Nieuwe zorg-routine" : "Nieuwe routine",
      body: input.title,
      entityType: "routine",
      entityId: id,
      payload: { taskId: id, childId: input.childId },
    });
    return mapTaskRow(data);
  },

  async completeRoutineOccurrence(input) {
    const supabase = await db();
    const { data: membership } = await supabase
      .from("family_members")
      .select("permissions, role, relation_type, contact_only")
      .eq("id", input.actorMemberId)
      .maybeSingle();
    if (!membership) throw new Error("Lid niet gevonden.");
    const actor = {
      permissions: membership.permissions ?? parentPermissions(),
      role: membership.role,
      relationType: membership.relation_type,
      contactOnly: membership.contact_only,
    } as FamilyMember;
    if (!memberPermissions(actor).completeTasks) {
      throw new Error("Je hebt geen rechten om dit af te ronden.");
    }

    let occurrence = (
      await supabase.from("routine_occurrences").select("*").eq("id", input.occurrenceId).maybeSingle()
    ).data;

    if (!occurrence) {
      const parts = input.occurrenceId.split(":");
      if (parts.length < 3) throw new Error("Routine niet gevonden.");
      const time = parts.pop()!;
      const date = parts.pop()!;
      const routineId = parts.join(":");
      const { data: routine } = await supabase
        .from("tasks")
        .select("family_id, child_id, assignee_member_id")
        .eq("id", routineId)
        .maybeSingle();
      if (!routine) throw new Error("Routine niet gevonden.");
      occurrence = {
        id: input.occurrenceId,
        routine_id: routineId,
        family_id: routine.family_id,
        child_id: routine.child_id,
        date,
        time,
        assignee_member_id: routine.assignee_member_id,
        status: "pending",
      };
    }

    const now = new Date().toISOString();
    await supabase.from("routine_occurrences").upsert({
      id: occurrence.id,
      routine_id: occurrence.routine_id,
      family_id: occurrence.family_id,
      child_id: occurrence.child_id,
      date: occurrence.date,
      time: occurrence.time,
      assignee_member_id: occurrence.assignee_member_id,
      status: "done",
      completed_at: now,
      completed_by_member_id: input.actorMemberId,
      notes: input.notes ?? null,
    });
  },

  async reopenRoutineOccurrence(occurrenceId, _actorUserId) {
    const supabase = await db();
    const { data: occurrence } = await supabase
      .from("routine_occurrences")
      .select("status")
      .eq("id", occurrenceId)
      .maybeSingle();
    if (!occurrence || occurrence.status !== "done") return;
    await supabase
      .from("routine_occurrences")
      .update({
        status: "pending",
        completed_at: null,
        completed_by_member_id: null,
        notes: null,
      })
      .eq("id", occurrenceId);
  },

  async uploadExpenseReceipt(input) {
    const supabase = await db();
    const { data: row, error: fetchError } = await supabase
      .from("expenses")
      .select("id, family_id, receipt_url")
      .eq("id", input.expenseId)
      .maybeSingle();
    if (fetchError || !row) throw new Error("Kostenpost niet gevonden.");

    const storageFilename = newExpenseReceiptFilename(input.originalFilename);
    const storagePath = expenseReceiptStoragePath(row.family_id, storageFilename);
    const previousPath = row.receipt_url as string | null;
    const uploadedAt = new Date().toISOString();

    await storeExpenseReceiptBlob({
      familyId: row.family_id,
      storagePath,
      data: input.data,
      mimeType: input.mimeType,
    });
    if (previousPath) await deleteExpenseReceiptBlob(previousPath);

    const { data: updated, error } = await supabase
      .from("expenses")
      .update({
        receipt_url: storagePath,
        receipt_filename: input.originalFilename,
        receipt_uploaded_at: uploadedAt,
        receipt_mime_type: input.mimeType,
        updated_at: uploadedAt,
      })
      .eq("id", input.expenseId)
      .select("*")
      .single();
    if (error || !updated) throw error ?? new Error("Bon kon niet worden opgeslagen.");

    return {
      id: updated.id,
      familyId: updated.family_id,
      description: updated.description,
      amountCents: updated.amount_cents,
      currency: updated.currency,
      date: updated.date,
      childId: updated.child_id,
      category: updated.category,
      paidByMemberId: updated.paid_by_member_id,
      receiptStoragePath: updated.receipt_url,
      receiptFilename: updated.receipt_filename,
      receiptUploadedAt: updated.receipt_uploaded_at,
      receiptMimeType: updated.receipt_mime_type,
      notes: updated.notes,
      recurringExpenseId: updated.recurring_expense_id,
      voidedAt: updated.voided_at,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      createdBy: updated.created_by,
    };
  },

  async removeExpenseReceipt(input) {
    const supabase = await db();
    const { data: row } = await supabase
      .from("expenses")
      .select("receipt_url")
      .eq("id", input.expenseId)
      .maybeSingle();
    if (row?.receipt_url) await deleteExpenseReceiptBlob(row.receipt_url);
    await supabase
      .from("expenses")
      .update({
        receipt_url: null,
        receipt_filename: null,
        receipt_uploaded_at: null,
        receipt_mime_type: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.expenseId);
  },

  async getExpenseReceiptViewUrl(input) {
    const supabase = await db();
    const { data: row } = await supabase
      .from("expenses")
      .select("receipt_url")
      .eq("id", input.expenseId)
      .maybeSingle();
    if (!row?.receipt_url) return null;
    return expenseReceiptViewUrl(row.receipt_url, input.expenseId);
  },

  async createContextMessage(input) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("context_messages")
      .insert({
        family_id: input.familyId,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        kind: input.kind,
        body: input.body,
        author_member_id: input.authorMemberId,
        status: "sent",
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Bericht kon niet worden opgeslagen.");
    return mapContextMessageRow(data);
  },

  async markContextMessageRead(input) {
    const supabase = await db();
    const { data: message } = await supabase
      .from("context_messages")
      .select("author_member_id, read_at, kind, status")
      .eq("id", input.messageId)
      .maybeSingle();
    if (!message) throw new Error("Bericht niet gevonden.");
    if (message.author_member_id === input.readerMemberId) return;
    if (message.read_at) return;

    const nextStatus =
      message.kind === "confirmation" ? message.status : "read";
    await supabase
      .from("context_messages")
      .update({
        read_at: new Date().toISOString(),
        read_by_member_id: input.readerMemberId,
        status: nextStatus,
      })
      .eq("id", input.messageId);
  },

  async respondToContextMessage(input) {
    const supabase = await db();
    const { data: message } = await supabase
      .from("context_messages")
      .select("author_member_id, read_at")
      .eq("id", input.messageId)
      .maybeSingle();
    if (!message) throw new Error("Bericht niet gevonden.");
    if (message.author_member_id === input.responderMemberId) {
      throw new Error("Je kunt niet op je eigen bericht reageren.");
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, string> = {
      status: input.decision,
      response_body: input.responseBody ?? (input.decision === "confirmed" ? "Ja" : "Nee"),
      responded_at: now,
      responded_by_member_id: input.responderMemberId,
    };
    if (!message.read_at) {
      updatePayload.read_at = now;
      updatePayload.read_by_member_id = input.responderMemberId;
    }
    await supabase.from("context_messages").update(updatePayload).eq("id", input.messageId);
  },

  async handoverCheckIn(input) {
    const supabase = await db();
    const { data: handover } = await supabase
      .from("handovers")
      .select("id, family_id")
      .eq("id", input.handoverId)
      .maybeSingle();
    if (!handover) throw new Error("Overdracht niet gevonden.");

    const { data: existing } = await supabase
      .from("handover_check_ins")
      .select("id")
      .eq("handover_id", input.handoverId)
      .maybeSingle();
    if (existing) return;

    const { error } = await supabase.from("handover_check_ins").insert({
      family_id: handover.family_id,
      handover_id: input.handoverId,
      member_id: input.memberId,
    });
    if (error) throw error;

    await supabase.from("activity_log").insert({
      family_id: handover.family_id,
      actor_id: input.actorUserId,
      action: "handover.check_in",
      entity_type: "handover",
      entity_id: input.handoverId,
      before: null,
      after: { memberId: input.memberId },
    });
  },

  async createGuestLink(input) {
    const supabase = await db();
    const token = generateGuestToken();
    const { data, error } = await supabase
      .from("guest_link_tokens")
      .insert({
        family_id: input.familyId,
        label: input.label,
        token_hash: hashGuestToken(token),
        expires_at: guestLinkExpiresAt(input.expiresInDays ?? 7),
        scopes: input.scopes,
        change_request_id: input.changeRequestId,
        created_by_member_id: input.createdByMemberId,
      })
      .select(GUEST_LINK_COLUMNS)
      .single();
    if (error || !data) throw error ?? new Error("Gastlink kon niet worden aangemaakt.");
    return mapGuestLinkRow(data, token);
  },

  async getGuestLinkByToken(token) {
    if (!hasServiceRoleKey()) return null;

    const admin = createSupabaseAdminClient();
    const { data: linkRow, error } = await admin
      .from("guest_link_tokens")
      .select(GUEST_LINK_COLUMNS)
      .eq("token_hash", hashGuestToken(token))
      .maybeSingle();
    if (error || !linkRow) return null;

    const link = mapGuestLinkRow(linkRow, token);
    const snapshot = await buildGuestSnapshot(admin, link.familyId);
    if (!snapshot) return null;
    return { link, snapshot };
  },

  async respondToGuestLink(input) {
    if (!hasServiceRoleKey()) {
      throw new Error("Gastlinks vereisen SUPABASE_SERVICE_ROLE_KEY.");
    }

    const admin = createSupabaseAdminClient();
    const { data: linkRow, error } = await admin
      .from("guest_link_tokens")
      .select(GUEST_LINK_COLUMNS)
      .eq("token_hash", hashGuestToken(input.token))
      .maybeSingle();
    if (error || !linkRow) throw new Error("Link niet gevonden.");

    const link = mapGuestLinkRow(linkRow, input.token);
    if (link.response) throw new Error("Er is al gereageerd op dit verzoek.");
    if (new Date(link.expiresAt) < new Date()) throw new Error("Deze link is verlopen.");

    if (link.changeRequestId) {
      assertGuestCanRespondToChangeRequest(link);
    }

    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("guest_link_tokens")
      .update({
        response: input.decision,
        responded_at: now,
        responded_by_name: input.respondedByName,
      })
      .eq("id", link.id);
    if (updateError) throw updateError;

    if (link.changeRequestId) {
      const { data: requestRow } = await admin
        .from("change_requests")
        .select("*")
        .eq("id", link.changeRequestId)
        .maybeSingle();
      if (requestRow && requestRow.status === "pending") {
        const request = mapChangeRequestRow(requestRow);
        const status = input.decision === "accepted" ? "accepted" : "declined";
        await admin
          .from("change_requests")
          .update({
            status,
            response_message: `${input.respondedByName}: ${input.decision === "accepted" ? "Ja" : "Nee"}`,
            resolved_at: now,
            updated_at: now,
          })
          .eq("id", link.changeRequestId);
        if (input.decision === "accepted") {
          await applyGuestAcceptedChange(admin, request);
        }
      }
    }
  },

  async createImportJob(input) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("import_jobs")
      .insert({
        family_id: input.familyId,
        source: input.source,
        status: "pending",
        file_name: input.fileName ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Import kon niet worden gestart.");
    return mapImportJobRow(data);
  },

  async getShoppingLists(familyId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("shopping_lists")
      .select("*")
      .eq("family_id", familyId)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });
    if (error) throwIfMissingShoppingTables(error);
    const lists = (data ?? []).map(mapShoppingListRow);
    if (!lists.length) {
      const actorId = (await currentUserId(supabase)) ?? "";
      if (!actorId) return [];
      try {
        const created = await this.createShoppingList({
          familyId,
          name: buildDefaultShoppingList({ familyId, createdBy: actorId }).name,
          createdBy: actorId,
          isDefault: true,
        });
        return [created];
      } catch (createError) {
        throwIfMissingShoppingTables(createError);
        throw createError;
      }
    }
    return sortShoppingLists(lists);
  },

  async createShoppingList(input) {
    const supabase = await db();
    const id = randomUUID();
    const isDefault = input.isDefault ?? false;
    if (isDefault) {
      await supabase
        .from("shopping_lists")
        .update({ is_default: false })
        .eq("family_id", input.familyId)
        .eq("is_default", true);
    }
    const { data, error } = await supabase
      .from("shopping_lists")
      .insert({
        id,
        family_id: input.familyId,
        name: input.name.trim(),
        is_default: isDefault,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error || !data) {
      if (error) throwIfMissingShoppingTables(error);
      throw error ?? new Error("Lijst kon niet worden aangemaakt.");
    }
    return mapShoppingListRow(data);
  },

  async renameShoppingList(listId, name, _actorUserId) {
    const supabase = await db();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Geef een naam op.");
    const { data, error } = await supabase
      .from("shopping_lists")
      .update({ name: trimmed })
      .eq("id", listId)
      .select("*")
      .single();
    if (error || !data) {
      if (error) throwIfMissingShoppingTables(error);
      throw error ?? new Error("Lijst kon niet worden hernoemd.");
    }
    return mapShoppingListRow(data);
  },

  async deleteShoppingList(listId, _actorUserId) {
    const supabase = await db();
    const { error } = await supabase.from("shopping_lists").delete().eq("id", listId);
    if (error) throwIfMissingShoppingTables(error);
  },

  async getShoppingItems(listId, familyId) {
    const supabase = await db();
    const { data: list, error: listError } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("id", listId)
      .eq("family_id", familyId)
      .maybeSingle();
    if (listError) throwIfMissingShoppingTables(listError);
    if (!list) return [];
    const { data, error } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("list_id", listId)
      .eq("family_id", familyId)
      .order("completed", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throwIfMissingShoppingTables(error);
    return sortShoppingItems((data ?? []).map(mapShoppingItemRow));
  },

  async addShoppingItem(input) {
    const supabase = await db();
    const id = randomUUID();
    const category = input.category ?? inferShoppingCategory(input.name);
    const { data, error } = await supabase
      .from("shopping_items")
      .insert({
        id,
        family_id: input.familyId,
        list_id: input.listId,
        name: input.name.trim(),
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
        category,
        note: input.note ?? null,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error || !data) {
      if (error) throwIfMissingShoppingTables(error);
      throw error ?? new Error("Item kon niet worden toegevoegd.");
    }
    return mapShoppingItemRow(data);
  },

  async updateShoppingItem(input) {
    const supabase = await db();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.quantity !== undefined) patch.quantity = input.quantity;
    if (input.unit !== undefined) patch.unit = input.unit;
    if (input.category !== undefined) patch.category = input.category;
    if (input.note !== undefined) patch.note = input.note;
    const { data, error } = await supabase
      .from("shopping_items")
      .update(patch)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error || !data) {
      if (error) throwIfMissingShoppingTables(error);
      throw error ?? new Error("Item kon niet worden bijgewerkt.");
    }
    return mapShoppingItemRow(data);
  },

  async toggleShoppingItem(itemId, actorUserId, _actorMemberId) {
    const supabase = await db();
    const { data: existing, error: readError } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("id", itemId)
      .maybeSingle();
    if (readError) throwIfMissingShoppingTables(readError);
    if (!existing) throw new Error("Item niet gevonden.");
    const completed = !existing.completed;
    const { data, error } = await supabase
      .from("shopping_items")
      .update({
        completed,
        completed_by: completed ? actorUserId : null,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", itemId)
      .select("*")
      .single();
    if (error || !data) {
      if (error) throwIfMissingShoppingTables(error);
      throw error ?? new Error("Item kon niet worden bijgewerkt.");
    }
    return mapShoppingItemRow(data);
  },

  async deleteShoppingItem(itemId, _actorUserId) {
    const supabase = await db();
    const { error } = await supabase.from("shopping_items").delete().eq("id", itemId);
    if (error) throwIfMissingShoppingTables(error);
  },

  async clearCompletedShoppingItems(listId, _actorUserId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("shopping_items")
      .delete()
      .eq("list_id", listId)
      .eq("completed", true)
      .select("id");
    if (error) throwIfMissingShoppingTables(error);
    return data?.length ?? 0;
  },

  async getCalendarFeedStatus(userId): Promise<CalendarFeedStatus | null> {
    try {
      const supabase = await db();
      const { data, error } = await supabase
        .from("calendar_feed_tokens")
        .select("created_at")
        .eq("user_id", userId)
        .is("revoked_at", null)
        .maybeSingle();
      if (error) return null;
      return data?.created_at ? { createdAt: data.created_at as string } : null;
    } catch {
      return null;
    }
  },

  async issueCalendarFeedToken(userId, familyId) {
    const supabase = await db();
    const token = newCalendarFeedToken();
    const now = new Date().toISOString();
    const { error: revokeError } = await supabase
      .from("calendar_feed_tokens")
      .update({ revoked_at: now })
      .eq("user_id", userId)
      .is("revoked_at", null);
    if (revokeError) {
      if (isMissingCalendarFeedTableError(revokeError)) {
        throw new CalendarFeedNotActivatedError();
      }
      throw new Error(toUserFacingDbError(revokeError));
    }
    const { error } = await supabase.from("calendar_feed_tokens").insert({
      user_id: userId,
      family_id: familyId,
      token_hash: calendarFeedTokenHash(token),
    });
    if (error) {
      if (isMissingCalendarFeedTableError(error)) {
        throw new CalendarFeedNotActivatedError();
      }
      throw new Error(toUserFacingDbError(error));
    }
    return { token };
  },

  async revokeCalendarFeedToken(userId) {
    const supabase = await db();
    const { error } = await supabase
      .from("calendar_feed_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("revoked_at", null);
    if (error && !isMissingCalendarFeedTableError(error)) {
      throw new Error(toUserFacingDbError(error));
    }
  },

  async getCalendarFeedByToken(token) {
    if (!hasServiceRoleKey()) return null;
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("calendar_feed_tokens")
      .select("user_id, family_id, revoked_at")
      .eq("token_hash", calendarFeedTokenHash(token))
      .maybeSingle();
    if (error || !data || data.revoked_at) return null;
    const snapshot = await buildCalendarExportSnapshot(admin, data.user_id as string, data.family_id as string);
    if (!snapshot) return null;
    return { snapshot };
  },

  async touchCalendarFeedAccess(token) {
    if (!hasServiceRoleKey()) return;
    const admin = createSupabaseAdminClient();
    await admin
      .from("calendar_feed_tokens")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("token_hash", calendarFeedTokenHash(token))
      .is("revoked_at", null);
  },

  async addChildActivity(input) {
    const supabase = await db();
    const id = randomUUID();
    const { error } = await supabase.from("child_activities").insert({
      id,
      family_id: input.familyId,
      child_id: input.childId,
      title: input.title,
      kind: input.kind,
      location: input.location,
      weekday: input.weekday,
      start_time: input.startTime,
      end_time: input.endTime,
      bring_member_id: input.bringMemberId,
      pickup_member_id: input.pickupMemberId,
      stay_member_id: input.stayMemberId,
      contact_name: input.contactName,
      notes: input.notes,
      created_by: input.createdBy,
    });
    if (error) throw error;
    const { upcomingWeekdays, activityEventCategory } = await import("@/lib/child-life/activity-dates");
    for (const date of upcomingWeekdays(input.weekday, 12)) {
      await this.createEvent({
        familyId: input.familyId,
        createdBy: input.createdBy,
        title: input.title,
        category: activityEventCategory(input.kind),
        startsAt: `${date}T${input.startTime}:00`,
        endsAt: `${date}T${input.endTime ?? input.startTime}:00`,
        location: input.location,
        notes: input.notes,
        packingList: [],
        childIds: [input.childId],
        memberIds: [input.bringMemberId, input.pickupMemberId].filter(Boolean) as string[],
        dropoffMemberId: input.bringMemberId,
        pickupMemberId: input.pickupMemberId,
      });
    }
    return {
      id,
      familyId: input.familyId,
      childId: input.childId,
      title: input.title,
      kind: input.kind,
      location: input.location,
      weekday: input.weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      bringMemberId: input.bringMemberId,
      pickupMemberId: input.pickupMemberId,
      stayMemberId: input.stayMemberId,
      contactName: input.contactName,
      notes: input.notes,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: input.createdBy,
    };
  },

  async addChildContact(input) {
    const supabase = await db();
    const id = randomUUID();
    const { error } = await supabase.from("child_contacts").insert({
      id,
      family_id: input.familyId,
      child_id: input.childId,
      category: input.category,
      name: input.name,
      organization: input.organization,
      phone: input.phone,
      email: input.email,
      address: input.address,
      notes: input.notes,
      created_by: input.createdBy,
    });
    if (error) throw error;
    return {
      id,
      familyId: input.familyId,
      childId: input.childId,
      category: input.category,
      name: input.name,
      organization: input.organization,
      phone: input.phone,
      email: input.email,
      address: input.address,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: input.createdBy,
    };
  },

  async saveChildSchool(input) {
    const supabase = await db();
    const { error } = await supabase.from("child_schools").upsert({
      child_id: input.childId,
      family_id: input.familyId,
      name: input.name,
      class_name: input.className,
      teacher: input.teacher,
      contact: input.contact,
      hours: input.hours,
      gym_days: input.gymDays,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    await supabase
      .from("children")
      .update({ school: input.name, class_name: input.className })
      .eq("id", input.childId);
  },

  async addFamilyDocument(input) {
    const { familyFileStoragePath, newFamilyFilename, storeFamilyFile } = await import("@/lib/storage/family-files");
    const filename = newFamilyFilename(input.originalFilename);
    const storagePath = familyFileStoragePath(input.familyId, filename);
    await storeFamilyFile({
      familyId: input.familyId,
      storagePath,
      data: input.data,
      mimeType: input.mimeType,
    });
    const supabase = await db();
    const id = randomUUID();
    const { error } = await supabase.from("documents").insert({
      id,
      family_id: input.familyId,
      child_id: input.childId,
      title: input.title,
      category: input.category,
      storage_path: storagePath,
      mime_type: input.mimeType,
      created_by: input.createdBy,
    });
    if (error) throw error;
    return {
      id,
      familyId: input.familyId,
      childId: input.childId,
      title: input.title,
      category: input.category,
      storagePath,
      mimeType: input.mimeType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: input.createdBy,
    };
  },

  async familyDocumentViewUrl(documentId, actorUserId) {
    const snap = await this.getSnapshot(actorUserId);
    const doc = snap?.documents.find((item) => item.id === documentId);
    if (!doc?.storagePath) return null;
    const { familyFileViewUrl } = await import("@/lib/storage/family-files");
    return familyFileViewUrl(doc.storagePath, doc.id);
  },

  async updateNotificationPrefs(userId, prefs) {
    const supabase = await db();
    const { error } = await supabase.from("profiles").update({ notification_prefs: prefs }).eq("id", userId);
    if (error) throw error;
  },
};
