import { addDays, addMonths, format, getISODay, startOfWeek, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { generateHandovers, generateOccurrences } from "@/lib/custody/generate";
import { buildDemoLife } from "@/lib/data/seed-life";
import { buildDemoRoutines } from "@/lib/data/seed-routines";
import { defaultChildAccess, parentPermissions, presetPermissions } from "@/lib/members/permissions";
import { generateRoutineOccurrences } from "@/lib/routines/generate";
import { splitAmounts } from "@/lib/money";
import { famliColor } from "@/lib/brand/tokens";
import { IDS } from "@/lib/data/ids";
import type {
  CalendarEvent,
  ChangeRequest,
  Child,
  CustodyOccurrence,
  Expense,
  ExpenseSplit,
  FamilySnapshot,
  Profile,
  TaskItem,
} from "@/lib/domain/types";

function iso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function at(date: Date, time: string): string {
  return `${iso(date)}T${time}:00`;
}

function defaultPrefs() {
  const all = { inApp: true, email: true, push: false };
  return {
    handoverReminder: all,
    changeRequest: all,
    sport: { inApp: true, email: false, push: false },
    taskDue: all,
    expense: all,
    payment: all,
  };
}

function baseEvent(
  id: string,
  date: Date | string,
  time: string,
  end: string,
  fields: Partial<CalendarEvent> & Pick<CalendarEvent, "title" | "category">,
): CalendarEvent {
  const day = typeof date === "string" ? date : iso(date);
  const createdAt = `${day}T08:00:00`;
  return {
    id,
    familyId: IDS.family,
    description: null,
    startsAt: `${day}T${time}:00`,
    endsAt: `${day}T${end}:00`,
    allDay: false,
    location: null,
    notes: null,
    packingList: [],
    childIds: [IDS.roxy, IDS.sophie],
    memberIds: [],
    handoverId: null,
    cancelledAt: null,
    createdAt,
    updatedAt: createdAt,
    createdBy: IDS.emmaUser,
    ...fields,
  };
}

function ensureHandoverToday(occurrences: CustodyOccurrence[], todayIso: string, tomorrowIso: string) {
  const todayOcc = occurrences.find((item) => item.date === todayIso);
  const tomorrowOcc = occurrences.find((item) => item.date === tomorrowIso);
  if (!todayOcc || !tomorrowOcc) return;
  todayOcc.custodianMemberId = IDS.emmaMember;
  todayOcc.isOverride = true;
  todayOcc.source = "manual";
  tomorrowOcc.custodianMemberId = IDS.rogierMember;
  tomorrowOcc.isOverride = true;
  tomorrowOcc.source = "manual";
}

function nextThursdayWith(occurrences: CustodyOccurrence[], memberId: string, from: Date): string {
  for (let i = 1; i <= 21; i += 1) {
    const date = addDays(from, i);
    if (getISODay(date) !== 4) continue;
    const occ = occurrences.find((item) => item.date === iso(date));
    if (occ?.custodianMemberId === memberId) return iso(date);
  }
  return iso(addDays(from, ((4 - getISODay(from) + 7) % 7) || 7));
}

export function createDemoSnapshot(now = new Date()): FamilySnapshot {
  const today = new Date(now);
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const scheduleStart = subDays(monday, 14);
  const rangeStart = subDays(today, 45);
  const rangeEnd = addMonths(today, 5);
  const createdAt = at(subDays(today, 40), "09:00");
  const todayIso = iso(today);
  const tomorrowIso = iso(addDays(today, 1));

  const emma: Profile = {
    id: IDS.emmaUser,
    email: "emma@famli.test",
    firstName: "Emma",
    lastName: "Bakker",
    avatarUrl: null,
    phone: "+31 6 1234 8890",
    locale: "nl-NL",
    timezone: "Europe/Amsterdam",
    notificationPrefs: defaultPrefs(),
    onboardingCompletedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };

  const rogier: Profile = {
    id: IDS.rogierUser,
    email: "rogier@famli.test",
    firstName: "Rogier",
    lastName: "Bakker",
    avatarUrl: null,
    phone: "+31 6 8821 4409",
    locale: "nl-NL",
    timezone: "Europe/Amsterdam",
    notificationPrefs: defaultPrefs(),
    onboardingCompletedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };

  const sanne: Profile = {
    id: IDS.sanneUser,
    email: "sanne@famli.test",
    firstName: "Sanne",
    lastName: "Visser",
    avatarUrl: null,
    phone: "+31 6 7711 2200",
    locale: "nl-NL",
    timezone: "Europe/Amsterdam",
    notificationPrefs: defaultPrefs(),
    onboardingCompletedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };

  const children: Child[] = [
    {
      id: IDS.roxy,
      familyId: IDS.family,
      firstName: "Roxy",
      lastName: "Bakker",
      dateOfBirth: "2017-03-14",
      photoUrl: null,
      school: "OBS De Linden",
      className: "Groep 5",
      doctor: "Huisartsenpraktijk Parkzicht",
      dentist: "Tandartspraktijk Smit",
      daycare: null,
      sports: ["Hockey"],
      clothingSize: "146 / 152",
      shoeSize: "36",
      passportExpiresOn: iso(addMonths(today, 2)),
      passportNumber: "NXB12R37",
      emergencyContacts: [{ name: "Oma Lien", relation: "Oma", phone: "+31 6 4412 7788" }],
      notes: "Bitje verplicht bij hockey.",
      color: famliColor.child,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
    {
      id: IDS.sophie,
      familyId: IDS.family,
      firstName: "Sophie",
      lastName: "Bakker",
      dateOfBirth: "2019-08-20",
      photoUrl: null,
      school: "OBS De Linden",
      className: "Groep 3",
      doctor: "Huisartsenpraktijk Parkzicht",
      dentist: "Tandartspraktijk Smit",
      daycare: null,
      sports: ["Zwemles"],
      clothingSize: "128",
      shoeSize: "31",
      passportExpiresOn: iso(addMonths(today, 18)),
      passportNumber: null,
      emergencyContacts: [{ name: "Oma Lien", relation: "Oma", phone: "+31 6 4412 7788" }],
      notes: "Houdt van voorlezen voor het slapen.",
      color: famliColor.sport,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
  ];

  const schedule = {
    id: IDS.schedule,
    familyId: IDS.family,
    name: "2-2-3 schema",
    patternType: "two_two_three" as const,
    config: {
      parentAMemberId: IDS.emmaMember,
      parentBMemberId: IDS.rogierMember,
      handoverTime: "17:00",
      handoverLocation: "School",
    },
    startsOn: iso(scheduleStart),
    endsOn: null,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
    createdBy: IDS.emmaUser,
  };

  const occurrences = generateOccurrences({
    schedule,
    from: iso(rangeStart),
    to: iso(rangeEnd),
  });
  ensureHandoverToday(occurrences, todayIso, tomorrowIso);
  const thursday = nextThursdayWith(occurrences, IDS.rogierMember, today);
  const thursdayOcc = occurrences.find((item) => item.date === thursday);
  if (thursdayOcc) {
    thursdayOcc.custodianMemberId = IDS.rogierMember;
    thursdayOcc.isOverride = true;
    thursdayOcc.source = "manual";
  }

  let handovers = generateHandovers({
    familyId: IDS.family,
    occurrences,
    childIds: [IDS.roxy, IDS.sophie],
    createdBy: IDS.emmaUser,
    time: "17:00",
    location: "School",
  });

  const todayHandoverIndex = handovers.findIndex((item) => item.date === todayIso);
  if (todayHandoverIndex >= 0) {
    const current = handovers[todayHandoverIndex];
    handovers = [
      ...handovers.slice(0, todayHandoverIndex),
      {
        ...current,
        location: "School",
        pickupMemberId: current.toMemberId,
        dropoffMemberId: current.fromMemberId,
        packingList: ["schooltas", "hockeytas", "medicijnen"],
        notes: "Roxy heeft na school hockey.",
      },
      ...handovers.slice(todayHandoverIndex + 1),
    ];
  }

  const events: CalendarEvent[] = [];
  const rangeFrom = subDays(today, 7);
  const rangeTo = addDays(today, 14);

  for (let cursor = new Date(rangeFrom); cursor <= rangeTo; cursor = addDays(cursor, 1)) {
    const day = getISODay(cursor);
    const occ = occurrences.find((item) => item.date === iso(cursor));
    if (day <= 5) {
      events.push(
        baseEvent(`evt-school-${iso(cursor)}`, cursor, "08:30", "15:00", {
          title: "School",
          category: "school",
          location: "OBS De Linden",
        }),
        baseEvent(`evt-pickup-${iso(cursor)}`, cursor, "15:15", "15:30", {
          title: "Ophalen van school",
          category: "activiteit",
          location: "OBS De Linden",
          memberIds: occ ? [occ.custodianMemberId] : [IDS.emmaMember],
        }),
      );
    }
    if (day === 2) {
      events.push(
        baseEvent(`evt-hockey-${iso(cursor)}`, cursor, "18:00", "19:15", {
          title: "Hockey Roxy",
          category: "sport",
          location: "Sportpark",
          childIds: [IDS.roxy],
          packingList: ["Stick", "bitje", "bidon"],
          dropoffMemberId: occ?.custodianMemberId ?? IDS.emmaMember,
          pickupMemberId: occ?.custodianMemberId ?? IDS.emmaMember,
        }),
      );
    }
    if (day === 3) {
      events.push(
        baseEvent(`evt-zwem-${iso(cursor)}`, cursor, "17:30", "18:15", {
          title: "Zwemles Sophie",
          category: "sport",
          location: "Zwembad De Golfbreker",
          childIds: [IDS.sophie],
          packingList: ["Zwemkleding", "handdoek"],
          dropoffMemberId: occ?.custodianMemberId ?? IDS.emmaMember,
          pickupMemberId: occ?.custodianMemberId ?? IDS.emmaMember,
        }),
      );
    }
  }

  events.push(
    baseEvent("evt-tandarts", addDays(today, 6), "15:40", "16:10", {
      title: "Tandarts Roxy",
      category: "medisch",
      location: "Tandartspraktijk Smit",
      childIds: [IDS.roxy],
      memberIds: [IDS.emmaMember],
    }),
    baseEvent("evt-verjaardag", addDays(today, 11), "14:00", "17:00", {
      title: "Verjaardag oma Lien",
      category: "verjaardag",
      location: "Bij oma",
    }),
    {
      ...baseEvent("evt-weekend", addDays(today, ((6 - getISODay(today) + 7) % 7) || 7), "10:00", "18:00", {
        title: "Weekend bij papa",
        category: "verblijf",
        location: null,
      }),
      allDay: true,
      startsAt: `${iso(addDays(today, ((6 - getISODay(today) + 7) % 7) || 7))}T00:00:00`,
      endsAt: `${iso(addDays(today, ((6 - getISODay(today) + 7) % 7) || 7))}T23:59:00`,
    },
  );

  const handoverEvents: CalendarEvent[] = handovers
    .filter((item) => item.date >= iso(subDays(today, 7)) && item.date <= iso(addMonths(today, 2)))
    .map((item) => ({
      id: `evt-han-${item.id}`,
      familyId: IDS.family,
      title: "Wisselmoment",
      description: null,
      category: "overdracht" as const,
      startsAt: `${item.date}T${item.time}:00`,
      endsAt: `${item.date}T${item.time}:00`,
      allDay: false,
      location: item.location,
      notes: item.notes,
      packingList: item.packingList,
      childIds: item.childIds,
      memberIds: [item.fromMemberId, item.toMemberId],
      handoverId: item.id,
      cancelledAt: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    }));

  events.push(...handoverEvents);
  handovers = handovers.map((item) => ({
    ...item,
    eventId: `evt-han-${item.id}`,
  }));

  const life = buildDemoLife(today, createdAt);
  events.push(...life.extraEvents);

  const changeRequests: ChangeRequest[] = [
    {
      id: "cr-thursday",
      familyId: IDS.family,
      type: "swap_day",
      status: "pending",
      requestedByMemberId: IDS.emmaMember,
      targetDate: thursday,
      payload: { requestedCustodianMemberId: IDS.emmaMember },
      message: "Kunnen de kinderen donderdag bij mij blijven? Ik ben die middag vrij.",
      responseMessage: null,
      alternativePayload: null,
      resolvedAt: null,
      createdAt: at(subDays(today, 1), "20:14"),
      updatedAt: at(subDays(today, 1), "20:14"),
    },
  ];

  const friday = iso(addDays(today, ((5 - getISODay(today) + 7) % 7) || 7));
  const demoRoutines = buildDemoRoutines(createdAt);
  const tasks: TaskItem[] = [
    {
      id: "task-hockeyshirt",
      familyId: IDS.family,
      title: "Hockeyshirt bestellen",
      description: "Maat 152, clubshop MHC",
      childId: IDS.roxy,
      assigneeMemberId: IDS.rogierMember,
      dueAt: `${friday}T18:00:00`,
      status: "open",
      kind: "one_off",
      attachmentUrl: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.rogierUser,
    },
    {
      id: "task-tandarts",
      familyId: IDS.family,
      title: "Tandarts bellen vóór vrijdag",
      description: "Controle Roxy bevestigen.",
      childId: IDS.roxy,
      assigneeMemberId: IDS.emmaMember,
      dueAt: `${friday}T12:00:00`,
      status: "open",
      kind: "one_off",
      attachmentUrl: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
    {
      id: "task-passport",
      familyId: IDS.family,
      title: "Paspoort Roxy vernieuwen",
      description: "Verloopt binnenkort. Afspraak gemeente.",
      childId: IDS.roxy,
      assigneeMemberId: IDS.emmaMember,
      dueAt: at(addDays(today, 12), "09:00"),
      status: "open",
      kind: "one_off",
      attachmentUrl: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
    ...demoRoutines,
  ];

  const { expenses, splits } = buildExpenses(today);
  const childIds = [IDS.roxy, IDS.sophie];
  const households = [
    {
      id: IDS.householdEmma,
      familyId: IDS.family,
      name: "Huishouden Emma",
      memberIds: [IDS.emmaMember],
    },
    {
      id: IDS.householdRogier,
      familyId: IDS.family,
      name: "Huishouden Rogier",
      memberIds: [IDS.rogierMember, IDS.sanneMember],
    },
  ];
  const members = [
    {
      id: IDS.emmaMember,
      familyId: IDS.family,
      userId: IDS.emmaUser,
      role: "owner" as const,
      relationType: "ouder" as const,
      permissionPreset: "custom" as const,
      permissions: parentPermissions(),
      parentLabel: "Mama",
      displayColor: famliColor.parent1,
      invitedEmail: emma.email,
      status: "active" as const,
      householdId: IDS.householdEmma,
      contactOnly: false,
      linkedParentMemberId: null,
      phone: emma.phone,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: IDS.rogierMember,
      familyId: IDS.family,
      userId: IDS.rogierUser,
      role: "parent" as const,
      relationType: "ouder" as const,
      permissionPreset: "custom" as const,
      permissions: parentPermissions(),
      parentLabel: "Papa",
      displayColor: famliColor.parent2,
      invitedEmail: rogier.email,
      status: "active" as const,
      householdId: IDS.householdRogier,
      contactOnly: false,
      linkedParentMemberId: null,
      phone: rogier.phone,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: IDS.sanneMember,
      familyId: IDS.family,
      userId: IDS.sanneUser,
      role: "guardian" as const,
      relationType: "partner" as const,
      permissionPreset: "involved" as const,
      permissions: presetPermissions("involved", "partner"),
      parentLabel: "Partner",
      displayColor: "#7c9cff",
      invitedEmail: sanne.email,
      status: "active" as const,
      householdId: IDS.householdRogier,
      contactOnly: false,
      linkedParentMemberId: IDS.rogierMember,
      phone: sanne.phone,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: IDS.omaElsMember,
      familyId: IDS.family,
      userId: null,
      role: "viewer" as const,
      relationType: "opa_oma" as const,
      permissionPreset: "practical" as const,
      permissions: presetPermissions("practical", "opa_oma"),
      parentLabel: "Oma Els",
      displayColor: "#d4a574",
      invitedEmail: null,
      status: "active" as const,
      householdId: null,
      contactOnly: true,
      linkedParentMemberId: IDS.rogierMember,
      phone: "+31 6 4412 7788",
      createdAt,
      updatedAt: createdAt,
    },
  ];
  const childMemberAccess = [
    ...defaultChildAccess(IDS.sanneMember, childIds, true, false),
  ];
  const routineOccurrences = generateRoutineOccurrences(
    {
      family: { id: IDS.family } as FamilySnapshot["family"],
      tasks,
      occurrences,
      travelPlans: life.travelPlans,
      routineOccurrences: [],
    },
    iso(subDays(today, 7)),
    iso(addDays(today, 30)),
  );

  return {
    family: {
      id: IDS.family,
      name: "Gezin Bakker",
      ownerId: IDS.emmaUser,
      plan: "family",
      subscriptionStatus: "trialing",
      trialEnd: at(addDays(today, 18), "23:59"),
      featureFlags: {
        calendarSync: true,
        documents: true,
        yearOverview: true,
        aiAssistant: false,
        recurringExpenses: true,
      },
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
    currentProfile: emma,
    currentMember: {
      id: IDS.emmaMember,
      familyId: IDS.family,
      userId: IDS.emmaUser,
      role: "owner",
      relationType: "ouder",
      permissionPreset: "custom",
      permissions: parentPermissions(),
      parentLabel: "Mama",
      displayColor: famliColor.parent1,
      invitedEmail: emma.email,
      status: "active",
      householdId: IDS.householdEmma,
      contactOnly: false,
      linkedParentMemberId: null,
      phone: emma.phone,
      createdAt,
      updatedAt: createdAt,
    },
    profiles: {
      [IDS.emmaUser]: emma,
      [IDS.rogierUser]: rogier,
      [IDS.sanneUser]: sanne,
    },
    members,
    children,
    guardians: [
      { id: "g1", childId: IDS.roxy, memberId: IDS.emmaMember, relationship: "Moeder", isPrimary: true },
      { id: "g2", childId: IDS.roxy, memberId: IDS.rogierMember, relationship: "Vader", isPrimary: true },
      { id: "g3", childId: IDS.sophie, memberId: IDS.emmaMember, relationship: "Moeder", isPrimary: true },
      { id: "g4", childId: IDS.sophie, memberId: IDS.rogierMember, relationship: "Vader", isPrimary: true },
    ],
    schedule,
    occurrences,
    events,
    handovers,
    changeRequests,
    tasks,
    expenses,
    splits,
    recurringExpenses: [
      {
        id: "rec-hockey",
        familyId: IDS.family,
        description: "Hockeycontributie MHC",
        amountCents: 30000,
        currency: "EUR",
        category: "sport",
        interval: "yearly",
        intervalConfig: {},
        nextDueDate: iso(addMonths(today, 8)),
        paidByMemberId: IDS.rogierMember,
        splitPercents: { [IDS.emmaMember]: 50, [IDS.rogierMember]: 50 },
        childId: IDS.roxy,
        active: true,
        createdAt,
        updatedAt: createdAt,
        createdBy: IDS.rogierUser,
      },
    ],
    documents: [
      ...life.extraDocuments,
      {
        id: "doc-school",
        familyId: IDS.family,
        childId: IDS.sophie,
        title: "Schoolkaart Sophie",
        category: "school",
        storagePath: null,
        mimeType: "application/pdf",
        createdAt,
        updatedAt: createdAt,
        createdBy: IDS.emmaUser,
      },
    ],
    notifications: [
      {
        id: "n-rogier-change",
        familyId: IDS.family,
        userId: IDS.rogierUser,
        type: "change_request",
        title: "Wijzigingsvoorstel van Emma",
        body: `Emma vraagt ${format(parseDate(thursday), "EEEE d MMMM", { locale: nl })} te ruilen.`,
        payload: { changeRequestId: "cr-thursday" },
        readAt: null,
        channel: "in_app",
        createdAt: at(subDays(today, 1), "20:14"),
      },
      {
        id: "n-emma-cost",
        familyId: IDS.family,
        userId: IDS.emmaUser,
        type: "expense",
        title: "Hockeycontributie",
        body: "Jouw deel van de hockeycontributie staat open.",
        payload: { expenseId: "exp-hockey" },
        readAt: null,
        channel: "in_app",
        createdAt: at(subDays(today, 4), "11:02"),
      },
    ],
    calendarConnections: [],
    activityLog: [
      {
        id: "log-1",
        familyId: IDS.family,
        actorId: IDS.emmaUser,
        action: "schedule.created",
        entityType: "custody_schedule",
        entityId: IDS.schedule,
        before: null,
        after: { patternType: "two_two_three" },
        createdAt,
      },
      {
        id: "log-2",
        familyId: IDS.family,
        actorId: IDS.emmaUser,
        action: "change_request.created",
        entityType: "change_request",
        entityId: "cr-thursday",
        before: null,
        after: { type: "swap_day" },
        createdAt: at(subDays(today, 1), "20:14"),
      },
    ],
    invites: [],
    vacations: [
      {
        id: "vac-herfst",
        familyId: IDS.family,
        title: "Herfstvakantie",
        kind: "school",
        withMemberId: null,
        startsOn: iso(addDays(today, 40)),
        endsOn: iso(addDays(today, 48)),
        status: "planned",
        notes: null,
        createdAt,
        updatedAt: createdAt,
        createdBy: IDS.emmaUser,
        ...life.vacationPatch,
      },
      {
        id: "vac-papa",
        familyId: IDS.family,
        title: "Kamperen met papa",
        kind: "with_parent",
        withMemberId: IDS.rogierMember,
        startsOn: iso(addDays(today, 41)),
        endsOn: iso(addDays(today, 44)),
        status: "requested",
        notes: "Voorstel van Rogier",
        createdAt: at(subDays(today, 2), "19:00"),
        updatedAt: at(subDays(today, 2), "19:00"),
        createdBy: IDS.rogierUser,
      },
    ],
    sizes: life.sizes,
    sizeHistory: life.sizeHistory,
    neededItems: life.neededItems,
    parties: life.parties,
    schools: life.schools,
    clubs: life.clubs,
    travelPlans: life.travelPlans,
    travelSegments: life.travelSegments,
    childUpdates: life.childUpdates,
    households,
    childMemberAccess,
    routineOccurrences,
  };
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function buildExpenses(today: Date): { expenses: Expense[]; splits: ExpenseSplit[] } {
  const createdAt = `${iso(subDays(today, 4))}T11:02:00`;
  const emma = IDS.emmaMember;
  const papa = IDS.rogierMember;

  const defs = [
    {
      id: "exp-hockey",
      description: "Hockeycontributie",
      amountCents: 30000,
      date: iso(subDays(today, 4)),
      childId: IDS.roxy,
      category: "sport" as const,
      paidByMemberId: papa,
      percents: { [papa]: 50, [emma]: 50 },
      notes: "Seizoen 2026/2027",
      createdBy: IDS.rogierUser,
    },
    {
      id: "exp-sport",
      description: "Sportkosten",
      amountCents: 8500,
      date: iso(subDays(today, 6)),
      childId: IDS.roxy,
      category: "sport" as const,
      paidByMemberId: emma,
      percents: { [papa]: 50, [emma]: 50 },
      notes: "Toernooi zaterdag",
      createdBy: IDS.emmaUser,
    },
    {
      id: "exp-jas",
      description: "Regenjas Sophie",
      amountCents: 4000,
      date: iso(subDays(today, 12)),
      childId: IDS.sophie,
      category: "kleding" as const,
      paidByMemberId: emma,
      percents: { [papa]: 50, [emma]: 50 },
      notes: null,
      createdBy: IDS.emmaUser,
    },
  ];

  const expenses: Expense[] = [];
  const splits: ExpenseSplit[] = [];

  for (const def of defs) {
    expenses.push({
      id: def.id,
      familyId: IDS.family,
      description: def.description,
      amountCents: def.amountCents,
      currency: "EUR",
      date: def.date,
      childId: def.childId,
      category: def.category,
      paidByMemberId: def.paidByMemberId,
      receiptUrl: null,
      notes: def.notes,
      recurringExpenseId: null,
      voidedAt: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: def.createdBy,
    });
    const shares = splitAmounts(def.amountCents, def.percents);
    for (const [memberId, shareCents] of Object.entries(shares)) {
      splits.push({
        id: `${def.id}-${memberId}`,
        expenseId: def.id,
        memberId,
        shareCents,
        sharePercent: (def.percents as Record<string, number>)[memberId] ?? 0,
        paidAt: memberId === def.paidByMemberId ? createdAt : null,
        status: memberId === def.paidByMemberId ? "paid" : "pending",
      });
    }
  }

  return { expenses, splits };
}
