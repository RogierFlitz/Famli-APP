import { randomUUID } from "crypto";
import { addDaysIso, toISODate } from "@/lib/dates";
import { generateHandovers, generateOccurrences } from "@/lib/custody/generate";
import { splitAmounts } from "@/lib/money";
import { createDemoSnapshot } from "@/lib/data/seed";
import { IDS } from "@/lib/data/ids";
import { famliColor } from "@/lib/brand/tokens";
import type { FamilyRepository } from "@/lib/data/repository";
import type {
  ActivityLogEntry,
  CalendarEvent,
  ChangeRequest,
  Child,
  Expense,
  FamilyRole,
  FamilySnapshot,
  Profile,
  TaskItem,
  Vacation,
} from "@/lib/domain/types";

type Store = {
  families: Map<string, FamilySnapshot>;
  userFamily: Map<string, string>;
  users: Map<string, { profile: Profile }>;
  invites: Map<string, { familyId: string; email: string; parentLabel: string; role: FamilyRole }>;
};

const globalForStore = globalThis as unknown as { nestlyMemory?: Store };

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function emptyStore(): Store {
  const demo = createDemoSnapshot();
  return {
    families: new Map([[IDS.family, demo]]),
    userFamily: new Map([
      [IDS.emmaUser, IDS.family],
      [IDS.rogierUser, IDS.family],
    ]),
    users: new Map([
      [IDS.emmaUser, { profile: demo.profiles[IDS.emmaUser] }],
      [IDS.rogierUser, { profile: demo.profiles[IDS.rogierUser] }],
    ]),
    invites: new Map(),
  };
}

function getStore(): Store {
  if (!globalForStore.nestlyMemory) {
    globalForStore.nestlyMemory = emptyStore();
  }
  return globalForStore.nestlyMemory;
}

function attachViewer(family: FamilySnapshot, userId: string): FamilySnapshot {
  const snap = clone(family);
  const profile = getStore().users.get(userId)?.profile ?? family.profiles[userId];
  const member = snap.members.find((item) => item.userId === userId);
  if (profile) {
    snap.currentProfile = profile;
    snap.profiles[userId] = profile;
  }
  if (member) snap.currentMember = member;
  return snap;
}

function mutateFamily(familyId: string, mutate: (snap: FamilySnapshot) => void) {
  const snap = getStore().families.get(familyId);
  if (!snap) throw new Error("Gezin niet gevonden.");
  mutate(snap);
}

function log(
  snap: FamilySnapshot,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  const entry: ActivityLogEntry = {
    id: randomUUID(),
    familyId: snap.family.id,
    actorId,
    action,
    entityType,
    entityId,
    before,
    after,
    createdAt: nowIso(),
  };
  snap.activityLog.unshift(entry);
}

function refreshGenerated(snap: FamilySnapshot) {
  if (!snap.schedule) return;
  const from = addDaysIso(toISODate(new Date()), -60);
  const to = addDaysIso(toISODate(new Date()), 180);
  const overrides = snap.occurrences.filter((item) => item.isOverride);
  snap.occurrences = generateOccurrences({
    schedule: snap.schedule,
    from,
    to,
    existing: overrides,
  });
  const generated = generateHandovers({
    familyId: snap.family.id,
    occurrences: snap.occurrences,
    childIds: snap.children.map((child) => child.id),
    createdBy: snap.family.createdBy,
    time: snap.schedule.config.handoverTime,
    location: snap.schedule.config.handoverLocation,
    existing: snap.handovers,
  });
  snap.handovers = generated;
}

export const memoryRepository: FamilyRepository = {
  async getSnapshot(userId) {
    const familyId = getStore().userFamily.get(userId);
    if (!familyId) return null;
    const family = getStore().families.get(familyId);
    if (!family) return null;
    return attachViewer(family, userId);
  },

  async getProfile(userId) {
    return getStore().users.get(userId)?.profile ?? null;
  },

  async createLocalUser(input) {
    const userId = randomUUID();
    const profile: Profile = {
      id: userId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      avatarUrl: null,
      phone: null,
      locale: "nl-NL",
      timezone: "Europe/Amsterdam",
      notificationPrefs: {
        handoverReminder: { inApp: true, email: true, push: false },
        changeRequest: { inApp: true, email: true, push: false },
        sport: { inApp: true, email: false, push: false },
        taskDue: { inApp: true, email: true, push: false },
        expense: { inApp: true, email: true, push: false },
        payment: { inApp: true, email: true, push: false },
      },
      onboardingCompletedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    getStore().users.set(userId, { profile });
    return { userId };
  },

  async createFamily(input) {
    const familyId = randomUUID();
    const memberId = randomUUID();
    const createdAt = nowIso();
    const profile =
      getStore().users.get(input.userId)?.profile ??
      ({
        id: input.userId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        avatarUrl: null,
        phone: null,
        locale: "nl-NL",
        timezone: "Europe/Amsterdam",
        notificationPrefs: {
          handoverReminder: { inApp: true, email: true, push: false },
          changeRequest: { inApp: true, email: true, push: false },
          sport: { inApp: true, email: false, push: false },
          taskDue: { inApp: true, email: true, push: false },
          expense: { inApp: true, email: true, push: false },
          payment: { inApp: true, email: true, push: false },
        },
        onboardingCompletedAt: null,
        createdAt,
        updatedAt: createdAt,
      } satisfies Profile);
    getStore().users.set(input.userId, { profile });

    const snap: FamilySnapshot = {
      family: {
        id: familyId,
        name: input.familyName,
        ownerId: input.userId,
        plan: "free",
        subscriptionStatus: "trialing",
        trialEnd: new Date(Date.now() + 14 * 86400000).toISOString(),
        featureFlags: {
          calendarSync: false,
          documents: true,
          yearOverview: true,
          aiAssistant: false,
          recurringExpenses: false,
        },
        createdAt,
        updatedAt: createdAt,
        createdBy: input.userId,
      },
      currentProfile: profile,
      currentMember: {
        id: memberId,
        familyId,
        userId: input.userId,
        role: "owner",
        parentLabel: input.parentLabel,
        displayColor: famliColor.parent1,
        invitedEmail: input.email,
        status: "active",
        createdAt,
        updatedAt: createdAt,
      },
      profiles: { [input.userId]: profile },
      members: [],
      children: [],
      guardians: [],
      schedule: null,
      occurrences: [],
      events: [],
      handovers: [],
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
      vacations: [],
    };
    snap.members = [snap.currentMember];
    getStore().families.set(familyId, snap);
    getStore().userFamily.set(input.userId, familyId);
    return clone(snap);
  },

  async addChild(input) {
    const child: Child = {
      id: randomUUID(),
      familyId: input.familyId,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      photoUrl: null,
      school: null,
      className: null,
      doctor: null,
      dentist: null,
      daycare: null,
      sports: [],
      clothingSize: null,
      shoeSize: null,
      emergencyContacts: [],
      notes: null,
      color: input.firstName.length % 2 === 0 ? famliColor.child : famliColor.sport,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: input.createdBy,
    };
    mutateFamily(input.familyId, (snap) => {
      snap.children.push(child);
      for (const member of snap.members.filter((item) => item.role !== "viewer")) {
        snap.guardians.push({
          id: randomUUID(),
          childId: child.id,
          memberId: member.id,
          relationship: member.parentLabel,
          isPrimary: true,
        });
      }
    });
    return child;
  },

  async inviteParent(input) {
    const token = randomUUID();
    getStore().invites.set(token, {
      familyId: input.familyId,
      email: input.email,
      parentLabel: input.parentLabel,
      role: input.role ?? "parent",
    });
    mutateFamily(input.familyId, (snap) => {
      snap.invites.push({
        id: randomUUID(),
        familyId: input.familyId,
        email: input.email,
        role: input.role ?? "parent",
        parentLabel: input.parentLabel,
        token,
        expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        acceptedAt: null,
        createdAt: nowIso(),
      });
      snap.members.push({
        id: randomUUID(),
        familyId: input.familyId,
        userId: null,
        role: input.role ?? "parent",
        parentLabel: input.parentLabel,
        displayColor: famliColor.parent2,
        invitedEmail: input.email,
        status: "invited",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    });
    return { token };
  },

  async acceptInvite(token, userId) {
    const invite = getStore().invites.get(token);
    if (!invite) throw new Error("Uitnodiging is ongeldig of verlopen.");
    const host = getStore().families.get(invite.familyId);
    if (!host) throw new Error("Gezin niet gevonden.");
    const profile = getStore().users.get(userId)?.profile;
    if (!profile) throw new Error("Profiel ontbreekt.");

    mutateFamily(invite.familyId, (snap) => {
      snap.profiles[userId] = profile;
      const pending = snap.members.find(
        (member) => member.invitedEmail === invite.email && member.status === "invited",
      );
      if (pending) {
        pending.userId = userId;
        pending.status = "active";
        pending.updatedAt = nowIso();
      }
      const inv = snap.invites.find((item) => item.token === token);
      if (inv) inv.acceptedAt = nowIso();
    });

    getStore().userFamily.set(userId, invite.familyId);
    return attachViewer(host, userId);
  },

  async saveSchedule(input) {
    mutateFamily(input.familyId, (snap) => {
      snap.schedule = {
        id: snap.schedule?.id ?? randomUUID(),
        familyId: input.familyId,
        name: input.name,
        patternType: input.patternType,
        config: input.config,
        startsOn: input.startsOn,
        endsOn: null,
        isActive: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: input.createdBy,
      };
      refreshGenerated(snap);
      log(snap, input.createdBy, "schedule.saved", "custody_schedule", snap.schedule.id, null, {
        patternType: input.patternType,
      });
    });
  },

  async completeOnboarding(userId) {
    const profile = getStore().users.get(userId)?.profile;
    if (profile) profile.onboardingCompletedAt = nowIso();
    const familyId = getStore().userFamily.get(userId);
    const snap = familyId ? getStore().families.get(familyId) : null;
    if (snap?.profiles[userId]) snap.profiles[userId].onboardingCompletedAt = nowIso();
  },

  async createChangeRequest(input) {
    const request: ChangeRequest = {
      id: randomUUID(),
      familyId: input.familyId,
      type: input.type,
      status: "pending",
      requestedByMemberId: input.requestedByMemberId,
      targetDate: input.targetDate,
      payload: input.payload,
      message: input.message,
      responseMessage: null,
      alternativePayload: null,
      resolvedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    mutateFamily(input.familyId, (snap) => {
      snap.changeRequests.unshift(request);
      for (const member of snap.members) {
        if (member.id === input.requestedByMemberId || !member.userId) continue;
        snap.notifications.unshift({
          id: randomUUID(),
          familyId: input.familyId,
          userId: member.userId,
          type: "change_request",
          title: "Nieuw wijzigingsverzoek",
          body: input.message,
          payload: { changeRequestId: request.id },
          readAt: null,
          channel: "in_app",
          createdAt: nowIso(),
        });
      }
      log(snap, snap.currentProfile.id, "change_request.created", "change_request", request.id, null, {
        type: input.type,
        targetDate: input.targetDate,
      });
    });
    return request;
  },

  async respondToChangeRequest(input) {
    let updated: ChangeRequest | null = null;
    mutateFamilyFromUser(input.actorUserId, (snap) => {
      const request = snap.changeRequests.find((item) => item.id === input.id);
      if (!request) throw new Error("Verzoek niet gevonden.");
      const before = { status: request.status };
      request.status = input.decision;
      request.responseMessage = input.message ?? null;
      request.alternativePayload = input.alternativePayload ?? null;
      request.updatedAt = nowIso();
      if (input.decision !== "alternative_proposed") {
        request.resolvedAt = nowIso();
      }
      if (input.decision === "accepted") {
        applyAcceptedChange(snap, request);
      }
      log(snap, input.actorUserId, `change_request.${input.decision}`, "change_request", request.id, before, {
        status: request.status,
      });
      for (const member of snap.members) {
        if (!member.userId || member.id === input.actorMemberId) continue;
        snap.notifications.unshift({
          id: randomUUID(),
          familyId: snap.family.id,
          userId: member.userId,
          type: "change_request",
          title:
            input.decision === "accepted"
              ? "Verzoek geaccepteerd"
              : input.decision === "declined"
                ? "Verzoek afgewezen"
                : "Alternatief voorgesteld",
          body: input.message || request.message,
          payload: { changeRequestId: request.id },
          readAt: null,
          channel: "in_app",
          createdAt: nowIso(),
        });
      }
      updated = clone(request);
    });
    if (!updated) throw new Error("Verzoek niet gevonden.");
    return updated;
  },

  async createExpense(input) {
    const expense: Expense = {
      id: randomUUID(),
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
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: input.createdBy,
    };
    const shares = splitAmounts(input.amountCents, input.splitPercents);
    mutateFamily(input.familyId, (snap) => {
      snap.expenses.unshift(expense);
      for (const [memberId, shareCents] of Object.entries(shares)) {
        snap.splits.push({
          id: randomUUID(),
          expenseId: expense.id,
          memberId,
          shareCents,
          sharePercent: input.splitPercents[memberId] ?? 0,
          paidAt: memberId === input.paidByMemberId ? nowIso() : null,
          status: memberId === input.paidByMemberId ? "paid" : "pending",
        });
      }
      log(snap, input.createdBy, "expense.created", "expense", expense.id, null, {
        amountCents: input.amountCents,
      });
    });
    return expense;
  },

  async markSplitPaid(splitId, actorUserId) {
    mutateFamilyFromUser(actorUserId, (snap) => {
      const split = snap.splits.find((item) => item.id === splitId);
      if (!split) return;
      split.status = "paid";
      split.paidAt = nowIso();
      log(snap, actorUserId, "expense.split_paid", "expense_split", splitId, { status: "pending" }, {
        status: "paid",
      });
    });
  },

  async createTask(input) {
    const task: TaskItem = {
      id: randomUUID(),
      familyId: input.familyId,
      title: input.title,
      description: input.description,
      childId: input.childId,
      assigneeMemberId: input.assigneeMemberId,
      dueAt: input.dueAt,
      status: "open",
      attachmentUrl: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: input.createdBy,
    };
    mutateFamily(input.familyId, (snap) => {
      snap.tasks.unshift(task);
    });
    return task;
  },

  async updateTaskStatus(taskId, status, actorUserId) {
    mutateFamilyFromUser(actorUserId, (snap) => {
      const task = snap.tasks.find((item) => item.id === taskId);
      if (!task) return;
      task.status = status;
      task.updatedAt = nowIso();
    });
  },

  async createEvent(input) {
    const event: CalendarEvent = {
      id: randomUUID(),
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
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: input.createdBy,
    };
    mutateFamily(input.familyId, (snap) => {
      snap.events.push(event);
      log(snap, input.createdBy, "event.created", "event", event.id, null, { title: event.title });
    });
    return event;
  },

  async createVacation(input) {
    const vacation: Vacation = {
      id: randomUUID(),
      familyId: input.familyId,
      title: input.title,
      kind: input.kind,
      withMemberId: input.withMemberId,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      status: "requested",
      notes: input.notes,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: input.createdBy,
    };
    mutateFamily(input.familyId, (snap) => {
      snap.vacations.unshift(vacation);
    });
    return vacation;
  },

  async respondToVacation(id, actorUserId, accept) {
    mutateFamilyFromUser(actorUserId, (snap) => {
      const vacation = snap.vacations.find((item) => item.id === id);
      if (!vacation) return;
      vacation.status = accept ? "accepted" : "declined";
      vacation.updatedAt = nowIso();
    });
  },

  async updateCalendarPrivacy(userId, privacyMode) {
    const familyId = getStore().userFamily.get(userId);
    const snap = familyId ? getStore().families.get(familyId) : null;
    if (!snap) return;
    const connection = snap.calendarConnections.find((item) => item.userId === userId);
    if (connection) connection.privacyMode = privacyMode;
    else {
      snap.calendarConnections.push({
        id: randomUUID(),
        userId,
        familyId: snap.family.id,
        provider: "microsoft",
        privacyMode,
        status: "disconnected",
        syncOutbound: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  },

  async addRecurringExpense(input) {
    mutateFamily(input.familyId, (snap) => {
      snap.recurringExpenses.unshift({
        id: randomUUID(),
        familyId: input.familyId,
        description: input.description,
        amountCents: input.amountCents,
        currency: "EUR",
        category: input.category,
        interval: input.interval,
        intervalConfig: {},
        nextDueDate: input.nextDueDate,
        paidByMemberId: input.paidByMemberId,
        splitPercents: input.splitPercents,
        childId: input.childId,
        active: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: input.createdBy,
      });
    });
  },

  async markNotificationsRead(userId) {
    const familyId = getStore().userFamily.get(userId);
    const snap = familyId ? getStore().families.get(familyId) : null;
    if (!snap) return;
    snap.notifications = snap.notifications.map((item) =>
      item.userId === userId ? { ...item, readAt: item.readAt ?? nowIso() } : item,
    );
  },
};

function mutateFamilyFromUser(userId: string, mutate: (snap: FamilySnapshot) => void) {
  const familyId = getStore().userFamily.get(userId);
  if (!familyId) throw new Error("Geen gezin gevonden.");
  mutateFamily(familyId, mutate);
}

function applyAcceptedChange(snap: FamilySnapshot, request: ChangeRequest) {
  const requestedCustodian =
    typeof request.payload.requestedCustodianMemberId === "string"
      ? request.payload.requestedCustodianMemberId
      : request.requestedByMemberId;

  if (request.type === "swap_day" || request.type === "extra_day") {
    const existing = snap.occurrences.find((item) => item.date === request.targetDate);
    if (existing) {
      existing.originalCustodianMemberId = existing.originalCustodianMemberId ?? existing.custodianMemberId;
      existing.custodianMemberId = requestedCustodian;
      existing.isOverride = true;
      existing.source = "change_request";
      existing.updatedAt = nowIso();
    } else {
      snap.occurrences.push({
        id: randomUUID(),
        familyId: snap.family.id,
        scheduleId: snap.schedule?.id ?? "manual",
        childId: null,
        date: request.targetDate,
        custodianMemberId: requestedCustodian,
        isOverride: true,
        source: "change_request",
        originalCustodianMemberId: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    refreshGenerated(snap);
  }

  if (request.type === "pickup_time" || request.type === "location") {
    const handover = snap.handovers.find((item) => item.date === request.targetDate);
    if (handover) {
      if (typeof request.payload.time === "string") handover.time = request.payload.time;
      if (typeof request.payload.location === "string") handover.location = request.payload.location;
      handover.updatedAt = nowIso();
    }
  }
}
