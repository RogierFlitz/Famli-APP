import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { splitAmounts } from "@/lib/money";
import { generateHandovers, generateOccurrences } from "@/lib/custody/generate";
import { addDaysIso, toISODate } from "@/lib/dates";
import { famliColor } from "@/lib/brand/tokens";
import type { FamilyRepository } from "@/lib/data/repository";
import type {
  CalendarEvent,
  ChangeRequest,
  Child,
  CustodySchedule,
  Expense,
  ExpenseSplit,
  Family,
  FamilyMember,
  FamilySnapshot,
  Handover,
  Profile,
  TaskItem,
} from "@/lib/domain/types";

async function db() {
  return createSupabaseServerClient();
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
    notificationPrefs: (row.notification_prefs as Profile["notificationPrefs"]) ?? {
      handoverReminder: { inApp: true, email: true, push: false },
      changeRequest: { inApp: true, email: true, push: false },
      sport: { inApp: true, email: false, push: false },
      taskDue: { inApp: true, email: true, push: false },
      expense: { inApp: true, email: true, push: false },
      payment: { inApp: true, email: true, push: false },
    },
    onboardingCompletedAt: (row.onboarding_completed_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const supabaseRepository: FamilyRepository = {
  async getSnapshot(userId) {
    const supabase = await db();
    const { data: membership, error } = await supabase
      .from("family_members")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
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
      supabase.from("calendar_connections").select("*").eq("user_id", userId),
      supabase.from("activity_log").select("*").eq("family_id", familyId).order("created_at", { ascending: false }).limit(50),
      supabase.from("invites").select("*").eq("family_id", familyId),
      supabase.from("vacations").select("*").eq("family_id", familyId),
      supabase.from("custody_occurrences").select("*").eq("family_id", familyId),
      supabase.from("child_guardians").select("*"),
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
      parentLabel: row.parent_label,
      displayColor: row.display_color,
      invitedEmail: row.invited_email,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

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

    const children: Child[] = (childrenRes.data ?? []).map((row) => ({
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
      emergencyContacts: row.emergency_contacts ?? [],
      notes: row.notes,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    }));

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
      receiptUrl: row.receipt_url,
      notes: row.notes,
      recurringExpenseId: row.recurring_expense_id,
      voidedAt: row.voided_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    }));

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
      tasks: (tasksRes.data ?? []).map((row) => ({
        id: row.id,
        familyId: row.family_id,
        title: row.title,
        description: row.description,
        childId: row.child_id,
        assigneeMemberId: row.assignee_member_id,
        dueAt: row.due_at,
        status: row.status,
        attachmentUrl: row.attachment_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
      })),
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
        type: row.type,
        title: row.title,
        body: row.body,
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
    };

    return snapshot;
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
    const familyId = randomUUID();
    const memberId = randomUUID();
    const { error: familyError } = await supabase.from("families").insert({
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
    });
    if (familyError) throw familyError;
    const { error: memberError } = await supabase.from("family_members").insert({
      id: memberId,
      family_id: familyId,
      user_id: input.userId,
      role: "owner",
      parent_label: input.parentLabel,
      display_color: famliColor.parent1,
      invited_email: input.email,
      status: "active",
    });
    if (memberError) throw memberError;
    const snap = await this.getSnapshot(input.userId);
    if (!snap) throw new Error("Gezin kon niet worden geladen.");
    return snap;
  },

  async addChild(input) {
    const supabase = await db();
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
    const { data, error } = await supabase
      .from("change_requests")
      .update({
        status: input.decision,
        response_message: input.message ?? null,
        alternative_payload: input.alternativePayload ?? null,
        resolved_at: input.decision === "alternative_proposed" ? null : new Date().toISOString(),
      })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    if (input.decision === "accepted") {
      const requestedCustodian =
        typeof data.payload?.requestedCustodianMemberId === "string"
          ? data.payload.requestedCustodianMemberId
          : data.requested_by_member_id;
      await supabase.from("custody_occurrences").upsert({
        family_id: data.family_id,
        schedule_id: null,
        date: data.target_date,
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
      receiptUrl: null,
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
    return {
      id,
      familyId: input.familyId,
      title: input.title,
      description: input.description,
      childId: input.childId,
      assigneeMemberId: input.assigneeMemberId,
      dueAt: input.dueAt,
      status: "open",
      attachmentUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: input.createdBy,
    } satisfies TaskItem;
  },

  async updateTaskStatus(taskId, status) {
    const supabase = await db();
    await supabase.from("tasks").update({ status }).eq("id", taskId);
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
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: input.createdBy,
    };
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

  async respondToVacation(id, _actorUserId, accept) {
    const supabase = await db();
    await supabase
      .from("vacations")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", id);
  },

  async updateCalendarPrivacy(userId, privacyMode) {
    const supabase = await db();
    await supabase.from("calendar_connections").update({ privacy_mode: privacyMode }).eq("user_id", userId);
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

  async markNotificationsRead(userId) {
    const supabase = await db();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
  },
};
