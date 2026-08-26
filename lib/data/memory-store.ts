import { randomUUID } from "crypto";
import { generateInviteToken, inviteExpiresAt } from "@/lib/security/invites";
import { addDaysIso, toISODate } from "@/lib/dates";
import { generateHandovers, generateOccurrences } from "@/lib/custody/generate";
import { splitAmounts } from "@/lib/money";
import { createDemoSnapshot } from "@/lib/data/seed";
import { IDS } from "@/lib/data/ids";
import { famliColor } from "@/lib/brand/tokens";
import { emptyLifeFields, applyPrivacy } from "@/lib/life/privacy";
import {
  memberPermissions,
  parentPermissions,
  presetPermissions,
  roleForRelation,
} from "@/lib/members/permissions";
import { markPastOccurrencesUnregistered } from "@/lib/queries/routines";
import { refreshRoutineOccurrences } from "@/lib/routines/generate";
import {
  deleteExpenseReceiptBlob,
  expenseReceiptStoragePath,
  expenseReceiptViewUrl,
  newExpenseReceiptFilename,
  storeExpenseReceiptBlob,
} from "@/lib/storage/expense-receipts";
import type { FamilyRepository } from "@/lib/data/repository";
import type {
  ActivityLogEntry,
  CalendarEvent,
  ChangeRequest,
  Child,
  ChildSizes,
  ChildUpdate,
  ContextMessage,
  Expense,
  FamilyRole,
  FamilySnapshot,
  GuestLinkToken,
  ImportJob,
  NeededItem,
  Profile,
  TaskItem,
  TravelPlan,
  Vacation,
  MemberRelationType,
  PermissionPreset,
  RoutineOccurrence,
} from "@/lib/domain/types";
import {
  assertGuestCanRespondToChangeRequest,
  generateGuestToken,
  guestLinkExpiresAt,
  hashGuestToken,
} from "@/lib/architecture/guest-links";
import { createImportJobPlaceholder } from "@/lib/architecture/import";

type StoredGuestLink = GuestLinkToken & { tokenHash: string };

function findGuestLinkByToken(snap: { guestLinkTokens: GuestLinkToken[] }, token: string) {
  const hash = hashGuestToken(token);
  return snap.guestLinkTokens.find(
    (item) => (item as StoredGuestLink).tokenHash === hash,
  ) as StoredGuestLink | undefined;
}

type Store = {
  families: Map<string, FamilySnapshot>;
  userFamily: Map<string, string>;
  users: Map<string, { profile: Profile }>;
  invites: Map<string, { familyId: string; email: string; parentLabel: string; role: FamilyRole }>;
};

const globalForStore = globalThis as unknown as { famliMemoryV7?: Store };

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
      [IDS.sanneUser, IDS.family],
    ]),
    users: new Map([
      [IDS.emmaUser, { profile: demo.profiles[IDS.emmaUser] }],
      [IDS.rogierUser, { profile: demo.profiles[IDS.rogierUser] }],
      [IDS.sanneUser, { profile: demo.profiles[IDS.sanneUser] }],
    ]),
    invites: new Map(),
  };
}

function getStore(): Store {
  if (!globalForStore.famliMemoryV7) {
    globalForStore.famliMemoryV7 = emptyStore();
  }
  return globalForStore.famliMemoryV7;
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
  refreshRoutineOccurrences(snap);
  markPastOccurrencesUnregistered(snap);
  return applyPrivacy(snap);
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
  const handoverIds = new Set(generated.map((item) => item.id));
  snap.events = snap.events.filter((event) => event.category !== "overdracht" || (event.handoverId && handoverIds.has(event.handoverId)));
  for (const item of generated) {
    const eventId = item.eventId ?? `evt-han-${item.id}`;
    item.eventId = eventId;
    const existing = snap.events.find((event) => event.id === eventId);
    if (existing) {
      existing.startsAt = `${item.date}T${item.time}:00`;
      existing.endsAt = `${item.date}T${item.time}:00`;
      existing.location = item.location;
      existing.packingList = item.packingList;
      existing.memberIds = [item.fromMemberId, item.toMemberId];
      existing.handoverId = item.id;
      existing.cancelledAt = item.cancelledAt;
    } else {
      snap.events.push({
        id: eventId,
        familyId: snap.family.id,
        title: "Wisselmoment",
        description: null,
        category: "overdracht",
        startsAt: `${item.date}T${item.time}:00`,
        endsAt: `${item.date}T${item.time}:00`,
        allDay: false,
        location: item.location,
        notes: item.notes,
        packingList: item.packingList,
        childIds: item.childIds,
        memberIds: [item.fromMemberId, item.toMemberId],
        handoverId: item.id,
        cancelledAt: item.cancelledAt,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: snap.family.createdBy,
      });
    }
  }
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
        relationType: "ouder",
        permissionPreset: "custom",
        permissions: parentPermissions(),
        parentLabel: input.parentLabel,
        displayColor: famliColor.parent1,
        invitedEmail: input.email,
        status: "active",
        householdId: null,
        contactOnly: false,
        linkedParentMemberId: null,
        phone: null,
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
      ...emptyLifeFields(),
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
      passportExpiresOn: null,
      passportNumber: null,
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
        relationType: "ouder",
        permissionPreset: "custom",
        permissions: parentPermissions(),
        parentLabel: input.parentLabel,
        displayColor: famliColor.parent2,
        invitedEmail: input.email,
        status: "invited",
        householdId: null,
        contactOnly: false,
        linkedParentMemberId: null,
        phone: null,
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
      const actor = snap.members.find((item) => item.id === input.actorMemberId);
      if (!actor || !memberPermissions(actor).acceptChangeRequests) {
        throw new Error("Je hebt geen rechten om wijzigingsverzoeken te behandelen.");
      }
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
      receiptStoragePath: null,
      receiptFilename: null,
      receiptUploadedAt: null,
      receiptMimeType: null,
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
      kind: input.kind ?? "one_off",
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
      dropoffMemberId: input.dropoffMemberId ?? null,
      pickupMemberId: input.pickupMemberId ?? null,
      schoolKind: input.schoolKind ?? null,
      cancelledAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: input.createdBy,
    };
    mutateFamily(input.familyId, (snap) => {
      snap.events.push(event);
      if (input.party) {
        const giftId = randomUUID();
        snap.neededItems.unshift({
          id: giftId,
          familyId: input.familyId,
          childId: input.party.forChildId,
          title: `Cadeau ${input.party.hostName}`,
          category: "cadeau",
          size: null,
          dueOn: input.startsAt.slice(0, 10),
          assigneeMemberId: null,
          budgetCents: input.party.giftBudgetCents ?? null,
          status: "nodig",
          notes: input.party.notes ?? null,
          photoUrl: null,
          hiddenFromChild: true,
          purchasedAt: null,
          purchasedByMemberId: null,
          priceCents: null,
          receiptUrl: null,
          expenseId: null,
          eventId: event.id,
          createdAt: nowIso(),
          createdBy: input.createdBy,
        });
        snap.parties.push({
          id: randomUUID(),
          familyId: input.familyId,
          eventId: event.id,
          forChildId: input.party.forChildId,
          hostName: input.party.hostName,
          address: input.party.address ?? null,
          contact: input.party.contact ?? null,
          rsvp: "pending",
          giftNeededItemId: giftId,
          giftBudgetCents: input.party.giftBudgetCents ?? null,
          notes: input.party.notes ?? null,
        });
      }
      log(snap, input.createdBy, "event.created", "event", event.id, null, { title: event.title });
    });
    return event;
  },

  async createHandover(input) {
    const handoverId = randomUUID();
    const eventId = `evt-han-${handoverId}`;
    mutateFamily(input.familyId, (snap) => {
      snap.handovers.push({
        id: handoverId,
        familyId: input.familyId,
        eventId,
        date: input.date,
        time: input.time,
        fromMemberId: input.fromMemberId,
        toMemberId: input.toMemberId,
        childIds: input.childIds,
        location: input.location,
        pickupMemberId: input.toMemberId,
        dropoffMemberId: input.fromMemberId,
        notes: input.notes,
        packingList: input.packingList,
        cancelledAt: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: input.createdBy,
      });
      snap.events.push({
        id: eventId,
        familyId: input.familyId,
        title: "Wisselmoment",
        description: null,
        category: "overdracht",
        startsAt: `${input.date}T${input.time}:00`,
        endsAt: `${input.date}T${input.time}:00`,
        allDay: false,
        location: input.location,
        notes: input.notes,
        packingList: input.packingList,
        childIds: input.childIds,
        memberIds: [input.fromMemberId, input.toMemberId],
        handoverId,
        cancelledAt: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: input.createdBy,
      });
    });
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

  async updateChildSizes(input) {
    let result: ChildSizes | null = null;
    mutateFamilyFromUser(input.actorUserId, (snap) => {
      const fields = {
        clothing: input.clothing,
        shoes: input.shoes,
        jacket: input.jacket,
        trousers: input.trousers,
        sport: input.sport,
        helmet: input.helmet,
        other: input.other,
      } as const;
      const current = snap.sizes.find((item) => item.childId === input.childId);
      const stamp = nowIso();
      if (current) {
        for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
          if ((current[key] ?? "") !== (fields[key] ?? "")) {
            snap.sizeHistory.unshift({
              id: randomUUID(),
              childId: input.childId,
              field: key,
              fromValue: current[key],
              toValue: fields[key],
              changedAt: stamp,
              changedBy: input.actorUserId,
            });
          }
        }
        Object.assign(current, fields, { updatedAt: stamp, updatedBy: input.actorUserId });
        result = current;
      } else {
        const created: ChildSizes = {
          childId: input.childId,
          ...fields,
          updatedAt: stamp,
          updatedBy: input.actorUserId,
        };
        snap.sizes.push(created);
        result = created;
      }
      const child = snap.children.find((item) => item.id === input.childId);
      if (child) {
        child.clothingSize = input.clothing;
        child.shoeSize = input.shoes;
        child.updatedAt = stamp;
      }
    });
    if (!result) throw new Error("Kind niet gevonden.");
    return result;
  },

  async createNeededItem(input) {
    const item: NeededItem = {
      id: randomUUID(),
      familyId: input.familyId,
      childId: input.childId,
      title: input.title,
      category: input.category,
      size: input.size,
      dueOn: input.dueOn,
      assigneeMemberId: input.assigneeMemberId,
      budgetCents: input.budgetCents,
      status: input.assigneeMemberId ? "wordt_geregeld" : "nodig",
      notes: input.notes,
      photoUrl: null,
      hiddenFromChild: input.hiddenFromChild,
      purchasedAt: null,
      purchasedByMemberId: null,
      priceCents: null,
      receiptUrl: null,
      expenseId: null,
      eventId: input.eventId,
      createdAt: nowIso(),
      createdBy: input.createdBy,
    };
    mutateFamily(input.familyId, (snap) => {
      snap.neededItems.unshift(item);
    });
    return item;
  },

  async claimNeededItem(id, actorUserId, actorMemberId) {
    mutateFamilyFromUser(actorUserId, (snap) => {
      const item = snap.neededItems.find((row) => row.id === id);
      if (!item) return;
      item.assigneeMemberId = actorMemberId;
      item.status = "wordt_geregeld";
    });
  },

  async purchaseNeededItem(input) {
    mutateFamilyFromUser(input.actorUserId, (snap) => {
      const item = snap.neededItems.find((row) => row.id === input.id);
      if (!item) return;
      item.status = "gekocht";
      item.purchasedAt = nowIso();
      item.purchasedByMemberId = input.actorMemberId;
      item.priceCents = input.priceCents;
      item.receiptUrl = input.receiptUrl;
      if (!item.assigneeMemberId) item.assigneeMemberId = input.actorMemberId;
    });
  },

  async unmarkNeededItemBought(id, actorUserId) {
    mutateFamilyFromUser(actorUserId, (snap) => {
      const item = snap.neededItems.find((row) => row.id === id);
      if (!item || item.status !== "gekocht") return;
      if (item.expenseId) throw new Error("Kan niet terugzetten: al gekoppeld aan kosten.");
      item.status = item.assigneeMemberId ? "wordt_geregeld" : "nodig";
      item.purchasedAt = null;
      item.purchasedByMemberId = null;
      item.priceCents = null;
      item.receiptUrl = null;
    });
  },

  async neededToExpense(input) {
    let createdExpense: Expense | null = null;
    mutateFamilyFromUser(input.actorUserId, (snap) => {
      const item = snap.neededItems.find((row) => row.id === input.id);
      if (!item) return;
      const amount = item.priceCents ?? item.budgetCents ?? 0;
      const created = nowIso();
      const expense: Expense = {
        id: randomUUID(),
        familyId: snap.family.id,
        description: item.title,
        amountCents: amount,
        currency: "EUR",
        date: created.slice(0, 10),
        childId: item.childId,
        category: item.category === "school" || item.category === "sport" || item.category === "kleding" ? item.category : "overig",
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
      snap.expenses.unshift(expense);
      const shares = splitAmounts(amount, input.splitPercents);
      for (const [memberId, shareCents] of Object.entries(shares)) {
        snap.splits.push({
          id: randomUUID(),
          expenseId: expense.id,
          memberId,
          shareCents,
          sharePercent: input.splitPercents[memberId] ?? 0,
          paidAt: memberId === input.paidByMemberId ? created : null,
          status: memberId === input.paidByMemberId ? "paid" : "pending",
        });
      }
      item.expenseId = expense.id;
      if (item.status !== "gekocht") {
        item.status = "gekocht";
        item.purchasedAt = created;
        item.purchasedByMemberId = input.paidByMemberId;
        item.priceCents = amount;
      }
      createdExpense = expense;
    });
    if (!createdExpense) throw new Error("Item niet gevonden.");
    return createdExpense;
  },

  async createChildUpdate(input) {
    const update: ChildUpdate = {
      id: randomUUID(),
      familyId: input.familyId,
      childId: input.childId,
      body: input.body,
      category: input.category,
      authorMemberId: input.authorMemberId,
      createdAt: nowIso(),
      photoUrl: null,
    };
    mutateFamily(input.familyId, (snap) => {
      snap.childUpdates.unshift(update);
    });
    return update;
  },

  async createTravelPlan(input) {
    const plan: TravelPlan = {
      id: randomUUID(),
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
    mutateFamily(input.familyId, (snap) => {
      snap.travelPlans.unshift(plan);
      if (input.outboundNumber || input.outboundDeparts) {
        snap.travelSegments.push({
          id: randomUUID(),
          travelPlanId: plan.id,
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
        snap.travelSegments.push({
          id: randomUUID(),
          travelPlanId: plan.id,
          kind: "return",
          carrier: null,
          number: input.returnNumber,
          fromPlace: input.returnFrom,
          toPlace: input.returnTo,
          departsAt: input.returnDeparts,
          arrivesAt: input.returnArrives,
        });
      }
      snap.events.push({
        id: `evt-${plan.id}`,
        familyId: input.familyId,
        title: plan.title,
        description: plan.destination,
        category: "vakantie",
        startsAt: `${plan.startsOn}T00:00:00`,
        endsAt: `${plan.endsOn}T23:59:00`,
        allDay: true,
        location: plan.destination,
        notes: plan.notes,
        packingList: [],
        childIds: plan.childIds,
        memberIds: [plan.withMemberId],
        handoverId: null,
        cancelledAt: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: input.createdBy,
      });
    });
    return plan;
  },

  async inviteMember(input) {
    const relationType = input.relationType;
    const preset = input.permissionPreset ?? (relationType === "partner" ? "involved" : "practical");
    const role = roleForRelation(relationType);
    const token = generateInviteToken();
    const expiresAt = inviteExpiresAt().toISOString();
    mutateFamily(input.familyId, (snap) => {
      const memberId = randomUUID();
      snap.members.push({
        id: memberId,
        familyId: input.familyId,
        userId: null,
        role,
        relationType,
        permissionPreset: preset,
        permissions: presetPermissions(preset, relationType),
        parentLabel: input.parentLabel,
        displayColor: input.displayColor ?? famliColor.parent2,
        invitedEmail: input.email,
        status: input.contactOnly ? "active" : "invited",
        householdId: input.householdId ?? null,
        contactOnly: input.contactOnly ?? false,
        linkedParentMemberId: input.linkedParentMemberId ?? null,
        phone: input.phone ?? null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      if (input.childIds?.length) {
        for (const childId of input.childIds) {
          snap.childMemberAccess.push({
            id: `${memberId}-${childId}`,
            memberId,
            childId,
            canView: true,
            canEdit: preset === "involved",
          });
        }
      }
      if (input.email && !input.contactOnly) {
        snap.invites.push({
          id: randomUUID(),
          familyId: input.familyId,
          email: input.email,
          role,
          parentLabel: input.parentLabel,
          token,
          expiresAt,
          acceptedAt: null,
          createdAt: nowIso(),
        });
        getStore().invites.set(token, {
          familyId: input.familyId,
          email: input.email,
          parentLabel: input.parentLabel,
          role,
        });
      }
    });
    return { token };
  },

  async createRoutine(input) {
    const task: TaskItem = {
      id: randomUUID(),
      familyId: input.familyId,
      title: input.title,
      description: input.description,
      childId: input.childId,
      assigneeMemberId: input.assigneeMemberId,
      dueAt: null,
      status: "open",
      kind: input.kind,
      weekdays: input.weekdays,
      times: input.times,
      assignMode: input.assignMode ?? "stay",
      careLabel: input.careLabel ?? null,
      careInstructions: input.careInstructions ?? null,
      packingItems: input.packingItems ?? [],
      active: true,
      attachmentUrl: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: input.createdBy,
    };
    mutateFamily(input.familyId, (snap) => {
      snap.tasks.unshift(task);
      refreshRoutineOccurrences(snap);
    });
    return task;
  },

  async completeRoutineOccurrence(input) {
    mutateFamilyFromUser(input.actorUserId, (snap) => {
      const actor = snap.members.find((item) => item.id === input.actorMemberId);
      if (!actor || !memberPermissions(actor).completeTasks) {
        throw new Error("Je hebt geen rechten om dit af te ronden.");
      }
      const occurrence = snap.routineOccurrences.find((item) => item.id === input.occurrenceId);
      if (!occurrence) throw new Error("Routine niet gevonden.");
      occurrence.status = "done";
      occurrence.completedAt = nowIso();
      occurrence.completedByMemberId = input.actorMemberId;
      occurrence.notes = input.notes ?? null;
    });
  },

  async reopenRoutineOccurrence(occurrenceId, actorUserId) {
    mutateFamilyFromUser(actorUserId, (snap) => {
      const occurrence = snap.routineOccurrences.find((item) => item.id === occurrenceId);
      if (!occurrence || occurrence.status !== "done") return;
      occurrence.status = "pending";
      occurrence.completedAt = null;
      occurrence.completedByMemberId = null;
      occurrence.notes = null;
    });
  },

  async uploadExpenseReceipt(input) {
    const familyId = getStore().userFamily.get(input.actorUserId);
    if (!familyId) throw new Error("Geen gezin gevonden.");
    const snap = getStore().families.get(familyId);
    const expense = snap?.expenses.find((item) => item.id === input.expenseId);
    if (!expense) throw new Error("Kostenpost niet gevonden.");

    const storageFilename = newExpenseReceiptFilename(input.originalFilename);
    const storagePath = expenseReceiptStoragePath(expense.familyId, storageFilename);
    const previousPath = expense.receiptStoragePath;

    await storeExpenseReceiptBlob({
      familyId: expense.familyId,
      storagePath,
      data: input.data,
      mimeType: input.mimeType,
    });
    if (previousPath) await deleteExpenseReceiptBlob(previousPath);

    const uploadedAt = nowIso();
    mutateFamily(familyId, (family) => {
      const row = family.expenses.find((item) => item.id === input.expenseId);
      if (!row) return;
      row.receiptStoragePath = storagePath;
      row.receiptFilename = input.originalFilename;
      row.receiptUploadedAt = uploadedAt;
      row.receiptMimeType = input.mimeType;
      row.updatedAt = uploadedAt;
      log(family, input.actorUserId, "expense.receipt_uploaded", "expense", row.id, null, {
        receiptFilename: input.originalFilename,
      });
    });

    const updated = getStore().families.get(familyId)?.expenses.find((item) => item.id === input.expenseId);
    if (!updated) throw new Error("Kostenpost niet gevonden.");
    return clone(updated);
  },

  async removeExpenseReceipt(input) {
    const familyId = getStore().userFamily.get(input.actorUserId);
    if (!familyId) throw new Error("Geen gezin gevonden.");
    const snap = getStore().families.get(familyId);
    const expense = snap?.expenses.find((item) => item.id === input.expenseId);
    if (!expense?.receiptStoragePath) return;

    await deleteExpenseReceiptBlob(expense.receiptStoragePath);
    mutateFamily(familyId, (family) => {
      const row = family.expenses.find((item) => item.id === input.expenseId);
      if (!row?.receiptStoragePath) return;
      log(family, input.actorUserId, "expense.receipt_removed", "expense", row.id, {
        receiptFilename: row.receiptFilename,
      }, null);
      row.receiptStoragePath = null;
      row.receiptFilename = null;
      row.receiptUploadedAt = null;
      row.receiptMimeType = null;
      row.updatedAt = nowIso();
    });
  },

  async getExpenseReceiptViewUrl(input) {
    const familyId = getStore().userFamily.get(input.actorUserId);
    if (!familyId) return null;
    const snap = getStore().families.get(familyId);
    const expense = snap?.expenses.find((item) => item.id === input.expenseId);
    if (!expense?.receiptStoragePath) return null;
    return expenseReceiptViewUrl(expense.receiptStoragePath, expense.id);
  },

  async createContextMessage(input) {
    const message: ContextMessage = {
      id: randomUUID(),
      familyId: input.familyId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      kind: input.kind,
      body: input.body,
      authorMemberId: input.authorMemberId,
      sentAt: nowIso(),
      readAt: null,
      readByMemberId: null,
      status: "sent",
      responseBody: null,
      respondedAt: null,
      respondedByMemberId: null,
    };
    mutateFamily(input.familyId, (snap) => {
      snap.contextMessages.push(message);
      log(snap, input.authorMemberId, "context_message.create", "context_message", message.id, null, {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      });
    });
    return clone(message);
  },

  async markContextMessageRead(input) {
    mutateFamilyFromUser(input.actorUserId, (snap) => {
      const message = snap.contextMessages.find((item) => item.id === input.messageId);
      if (!message) throw new Error("Bericht niet gevonden.");
      if (message.authorMemberId === input.readerMemberId) return;
      if (message.readAt) return;
      message.readAt = nowIso();
      message.readByMemberId = input.readerMemberId;
      message.status = message.kind === "confirmation" ? message.status : "read";
    });
  },

  async respondToContextMessage(input) {
    mutateFamilyFromUser(input.actorUserId, (snap) => {
      const message = snap.contextMessages.find((item) => item.id === input.messageId);
      if (!message) throw new Error("Bericht niet gevonden.");
      if (message.authorMemberId === input.responderMemberId) {
        throw new Error("Je kunt niet op je eigen bericht reageren.");
      }
      message.status = input.decision;
      message.responseBody = input.responseBody ?? (input.decision === "confirmed" ? "Ja" : "Nee");
      message.respondedAt = nowIso();
      message.respondedByMemberId = input.responderMemberId;
      if (!message.readAt) {
        message.readAt = nowIso();
        message.readByMemberId = input.responderMemberId;
      }
    });
  },

  async handoverCheckIn(input) {
    mutateFamilyFromUser(input.actorUserId, (snap) => {
      const handover = snap.handovers.find((item) => item.id === input.handoverId);
      if (!handover) throw new Error("Overdracht niet gevonden.");
      const existing = snap.handoverCheckIns.find((item) => item.handoverId === input.handoverId);
      if (existing) return;
      snap.handoverCheckIns.push({
        id: randomUUID(),
        handoverId: input.handoverId,
        memberId: input.memberId,
        checkedInAt: nowIso(),
      });
      log(snap, input.actorUserId, "handover.check_in", "handover", input.handoverId, null, {
        memberId: input.memberId,
      });
    });
  },

  async createGuestLink(input) {
    const token = generateGuestToken();
    const link: StoredGuestLink = {
      id: randomUUID(),
      familyId: input.familyId,
      label: input.label,
      token,
      tokenHash: hashGuestToken(token),
      expiresAt: guestLinkExpiresAt(input.expiresInDays ?? 7),
      scopes: input.scopes,
      changeRequestId: input.changeRequestId,
      createdByMemberId: input.createdByMemberId,
      createdAt: nowIso(),
      response: null,
      respondedAt: null,
      respondedByName: null,
    };
    mutateFamily(input.familyId, (snap) => {
      snap.guestLinkTokens.push(link);
    });
    return clone(link);
  },

  async getGuestLinkByToken(token) {
    for (const snap of getStore().families.values()) {
      const link = findGuestLinkByToken(snap, token);
      if (link) return { link: { ...clone(link), token }, snapshot: clone(snap) };
    }
    return null;
  },

  async respondToGuestLink(input) {
    for (const [familyId, snap] of getStore().families.entries()) {
      const link = findGuestLinkByToken(snap, input.token);
      if (!link) continue;
      if (link.response) throw new Error("Er is al gereageerd op dit verzoek.");
      if (new Date(link.expiresAt) < new Date()) throw new Error("Deze link is verlopen.");
      if (link.changeRequestId) {
        assertGuestCanRespondToChangeRequest(link);
      }

      mutateFamily(familyId, (family) => {
        const row = findGuestLinkByToken(family, input.token);
        if (!row) return;
        row.response = input.decision;
        row.respondedAt = nowIso();
        row.respondedByName = input.respondedByName;

        if (row.changeRequestId) {
          const request = family.changeRequests.find((item) => item.id === row.changeRequestId);
          if (request && request.status === "pending") {
            request.status = input.decision === "accepted" ? "accepted" : "declined";
            request.responseMessage = `${input.respondedByName}: ${input.decision === "accepted" ? "Ja" : "Nee"}`;
            request.resolvedAt = nowIso();
            request.updatedAt = nowIso();
            if (input.decision === "accepted") applyAcceptedChange(family, request);
          }
        }
      });
      return;
    }
    throw new Error("Link niet gevonden.");
  },

  async createImportJob(input) {
    const job = createImportJobPlaceholder(input.familyId, {
      source: input.source,
      fileName: input.fileName,
    });
    mutateFamily(input.familyId, (snap) => {
      snap.importJobs.push(job);
    });
    return clone(job);
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

  if (request.type === "pickup_time" || request.type === "location" || request.type === "pickup") {
    const handover = snap.handovers.find((item) => item.date === request.targetDate);
    if (handover) {
      if (typeof request.payload.time === "string" && request.payload.time) handover.time = request.payload.time;
      if (typeof request.payload.location === "string" && request.payload.location) {
        handover.location = request.payload.location;
      }
      if (typeof request.payload.pickupMemberId === "string" && request.payload.pickupMemberId) {
        handover.pickupMemberId = request.payload.pickupMemberId;
      }
      handover.updatedAt = nowIso();
      const event = snap.events.find((item) => item.id === handover.eventId);
      if (event) {
        event.startsAt = `${handover.date}T${handover.time}:00`;
        event.endsAt = `${handover.date}T${handover.time}:00`;
        event.location = handover.location;
        event.updatedAt = nowIso();
      }
    }
  }
}
