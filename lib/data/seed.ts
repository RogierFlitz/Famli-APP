import { addDays, addMonths, format, startOfWeek, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { generateHandovers, generateOccurrences } from "@/lib/custody/generate";
import { splitAmounts } from "@/lib/money";
import { famliColor } from "@/lib/brand/tokens";
import { IDS } from "@/lib/data/ids";
import type {
  CalendarEvent,
  ChangeRequest,
  Child,
  Expense,
  ExpenseSplit,
  FamilySnapshot,
  Handover,
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

export function createDemoSnapshot(now = new Date()): FamilySnapshot {
  const today = new Date(now);
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const scheduleStart = subDays(monday, 14);
  const rangeStart = subDays(today, 45);
  const rangeEnd = addMonths(today, 5);
  const createdAt = at(subDays(today, 40), "09:00");

  const emma: Profile = {
    id: IDS.emmaUser,
    email: "emma@nestly.test",
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
    email: "rogier@nestly.test",
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
      clothingSize: "134",
      shoeSize: "33",
      emergencyContacts: [
        { name: "Oma Lien", relation: "Oma", phone: "+31 6 4412 7788" },
      ],
      notes: "Bitje verplicht bij hockey. Neemt water mee.",
      color: famliColor.child,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
    {
      id: IDS.noah,
      familyId: IDS.family,
      firstName: "Noah",
      lastName: "Bakker",
      dateOfBirth: "2020-11-02",
      photoUrl: null,
      school: "OBS De Linden",
      className: "Groep 2",
      doctor: "Huisartsenpraktijk Parkzicht",
      dentist: "Tandartspraktijk Smit",
      daycare: "Kinderopvang De Klimop",
      sports: ["Zwemles"],
      clothingSize: "116",
      shoeSize: "28",
      emergencyContacts: [
        { name: "Oma Lien", relation: "Oma", phone: "+31 6 4412 7788" },
      ],
      notes: "Pinda-allergie. EpiPen zit in de schooltas.",
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

  let handovers = generateHandovers({
    familyId: IDS.family,
    occurrences,
    childIds: [IDS.roxy, IDS.noah],
    createdBy: IDS.emmaUser,
    time: "17:00",
    location: "School",
  });

  const todayIso = iso(today);
  const todayHandoverIndex = handovers.findIndex((item) => item.date === todayIso);
  if (todayHandoverIndex >= 0) {
    const current = handovers[todayHandoverIndex];
    handovers = [
      ...handovers.slice(0, todayHandoverIndex),
      {
        ...current,
        location: "Schoolplein OBS De Linden",
        pickupMemberId: current.toMemberId,
        dropoffMemberId: current.fromMemberId,
        packingList: ["Schooltas", "Hockeyspullen", "Medicijnen"],
        notes: "Roxy heeft na school hockey.",
      },
      ...handovers.slice(todayHandoverIndex + 1),
    ];
  }

  const hockeyDay =
    handovers.find((item) => item.date >= todayIso)?.date ?? todayIso;
  const nextSaturday = nextWeekday(today, 6);

  const events: CalendarEvent[] = [
    {
      id: "evt-school-today",
      familyId: IDS.family,
      title: "School",
      description: "OBS De Linden",
      category: "school",
      startsAt: at(today, "08:30"),
      endsAt: at(today, "15:00"),
      allDay: false,
      location: "OBS De Linden",
      notes: null,
      packingList: ["Lunch", "Gymspullen"],
      childIds: [IDS.roxy, IDS.noah],
      memberIds: [],
      handoverId: null,
      cancelledAt: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
    {
      id: "evt-hockey",
      familyId: IDS.family,
      title: "Hockey Roxy",
      description: "Training MHC",
      category: "sport",
      startsAt: `${hockeyDay}T18:00:00`,
      endsAt: `${hockeyDay}T19:15:00`,
      allDay: false,
      location: "Sportpark",
      notes: null,
      packingList: ["Stick", "Bitje", "Bidon"],
      childIds: [IDS.roxy],
      memberIds: [],
      handoverId: null,
      cancelledAt: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
    {
      id: "evt-zwemles",
      familyId: IDS.family,
      title: "Zwemles Noah",
      description: null,
      category: "sport",
      startsAt: at(addDays(today, 2), "16:30"),
      endsAt: at(addDays(today, 2), "17:15"),
      allDay: false,
      location: "Zwembad De Golfbreker",
      notes: "Handdoek in de tas",
      packingList: ["Zwemkleding", "Handdoek"],
      childIds: [IDS.noah],
      memberIds: [],
      handoverId: null,
      cancelledAt: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
    {
      id: "evt-tandarts",
      familyId: IDS.family,
      title: "Tandarts Roxy",
      description: "Controle",
      category: "medisch",
      startsAt: at(addDays(today, 6), "15:40"),
      endsAt: at(addDays(today, 6), "16:10"),
      allDay: false,
      location: "Tandartspraktijk Smit",
      notes: null,
      packingList: [],
      childIds: [IDS.roxy],
      memberIds: [IDS.emmaMember],
      handoverId: null,
      cancelledAt: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
    {
      id: "evt-verjaardag",
      familyId: IDS.family,
      title: "Verjaardag oma Lien",
      description: null,
      category: "verjaardag",
      startsAt: at(addDays(today, 11), "14:00"),
      endsAt: at(addDays(today, 11), "17:00"),
      allDay: false,
      location: "Bij oma",
      notes: null,
      packingList: [],
      childIds: [IDS.roxy, IDS.noah],
      memberIds: [IDS.emmaMember, IDS.rogierMember],
      handoverId: null,
      cancelledAt: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
  ];

  const handoverEvents: CalendarEvent[] = handovers
    .filter((item) => item.date >= iso(subDays(today, 7)) && item.date <= iso(addMonths(today, 2)))
    .map((item) => ({
      id: `evt-han-${item.id}`,
      familyId: IDS.family,
      title: "Overdracht",
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

  const changeRequests: ChangeRequest[] = [
    {
      id: "cr-saturday",
      familyId: IDS.family,
      type: "swap_day",
      status: "pending",
      requestedByMemberId: IDS.rogierMember,
      targetDate: iso(nextSaturday),
      payload: { requestedCustodianMemberId: IDS.rogierMember },
      message: `Kun jij ${format(nextSaturday, "EEEE d MMMM", { locale: nl })} overnemen? Ik heb die dag een late klus.`,
      responseMessage: null,
      alternativePayload: null,
      resolvedAt: null,
      createdAt: at(subDays(today, 1), "20:14"),
      updatedAt: at(subDays(today, 1), "20:14"),
    },
  ];

  const tasks: TaskItem[] = [
    {
      id: "task-form",
      familyId: IDS.family,
      title: "Schoolformulier kamp invullen",
      description: "Kamp groep 5, uiterlijk deze week.",
      childId: IDS.roxy,
      assigneeMemberId: IDS.emmaMember,
      dueAt: at(addDays(today, 2), "18:00"),
      status: "open",
      attachmentUrl: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
    {
      id: "task-hockeyshirt",
      familyId: IDS.family,
      title: "Hockeyshirt bestellen",
      description: "Maat 134, clubshop MHC",
      childId: IDS.roxy,
      assigneeMemberId: IDS.rogierMember,
      dueAt: at(addDays(today, 8), "12:00"),
      status: "in_progress",
      attachmentUrl: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.rogierUser,
    },
    {
      id: "task-passport",
      familyId: IDS.family,
      title: "Paspoort Noah vernieuwen",
      description: "Afspraak gemeente, meenemen oude paspoort.",
      childId: IDS.noah,
      assigneeMemberId: IDS.emmaMember,
      dueAt: at(addDays(today, 21), "09:00"),
      status: "open",
      attachmentUrl: null,
      createdAt,
      updatedAt: createdAt,
      createdBy: IDS.emmaUser,
    },
  ];

  const { expenses, splits } = buildExpenses(today);

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
      parentLabel: "Mama",
      displayColor: famliColor.parent1,
      invitedEmail: emma.email,
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    profiles: {
      [IDS.emmaUser]: emma,
      [IDS.rogierUser]: rogier,
    },
    members: [
      {
        id: IDS.emmaMember,
        familyId: IDS.family,
        userId: IDS.emmaUser,
        role: "owner",
        parentLabel: "Mama",
        displayColor: famliColor.parent1,
        invitedEmail: emma.email,
        status: "active",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: IDS.rogierMember,
        familyId: IDS.family,
        userId: IDS.rogierUser,
        role: "parent",
        parentLabel: "Papa",
        displayColor: famliColor.parent2,
        invitedEmail: rogier.email,
        status: "active",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    children,
    guardians: [
      { id: "g1", childId: IDS.roxy, memberId: IDS.emmaMember, relationship: "Moeder", isPrimary: true },
      { id: "g2", childId: IDS.roxy, memberId: IDS.rogierMember, relationship: "Vader", isPrimary: true },
      { id: "g3", childId: IDS.noah, memberId: IDS.emmaMember, relationship: "Moeder", isPrimary: true },
      { id: "g4", childId: IDS.noah, memberId: IDS.rogierMember, relationship: "Vader", isPrimary: true },
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
        id: "rec-opvang",
        familyId: IDS.family,
        description: "Kinderopvang De Klimop",
        amountCents: 42000,
        currency: "EUR",
        category: "opvang",
        interval: "monthly",
        intervalConfig: {},
        nextDueDate: iso(addDays(today, 6)),
        paidByMemberId: IDS.emmaMember,
        splitPercents: { [IDS.emmaMember]: 50, [IDS.rogierMember]: 50 },
        childId: IDS.noah,
        active: true,
        createdAt,
        updatedAt: createdAt,
        createdBy: IDS.emmaUser,
      },
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
      {
        id: "doc-paspoort",
        familyId: IDS.family,
        childId: IDS.roxy,
        title: "Paspoort Roxy",
        category: "identiteit",
        storagePath: null,
        mimeType: "application/pdf",
        createdAt,
        updatedAt: createdAt,
        createdBy: IDS.emmaUser,
      },
      {
        id: "doc-ouderschapsplan",
        familyId: IDS.family,
        childId: null,
        title: "Ouderschapsplan",
        category: "overeenkomst",
        storagePath: null,
        mimeType: "application/pdf",
        createdAt,
        updatedAt: createdAt,
        createdBy: IDS.emmaUser,
      },
      {
        id: "doc-allergie",
        familyId: IDS.family,
        childId: IDS.noah,
        title: "Allergie-informatie Noah",
        category: "medisch",
        storagePath: null,
        mimeType: "application/pdf",
        createdAt,
        updatedAt: createdAt,
        createdBy: IDS.emmaUser,
      },
    ],
    notifications: [
      {
        id: "n1",
        familyId: IDS.family,
        userId: IDS.emmaUser,
        type: "change_request",
        title: "Wijziging van Papa",
        body: "Rogier vraagt of jij zaterdag kunt overnemen.",
        payload: { changeRequestId: "cr-saturday" },
        readAt: null,
        channel: "in_app",
        createdAt: at(subDays(today, 1), "20:14"),
      },
      {
        id: "n2",
        familyId: IDS.family,
        userId: IDS.emmaUser,
        type: "expense",
        title: "Nieuwe gedeelde kosten",
        body: "Hockeycontributie €300 — jouw deel staat open.",
        payload: { expenseId: "exp-hockey" },
        readAt: null,
        channel: "in_app",
        createdAt: at(subDays(today, 4), "11:02"),
      },
    ],
    calendarConnections: [
      {
        id: "cal-emma",
        userId: IDS.emmaUser,
        familyId: IDS.family,
        provider: "microsoft",
        privacyMode: "busy",
        status: "disconnected",
        syncOutbound: false,
        createdAt,
        updatedAt: createdAt,
      },
    ],
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
        actorId: IDS.rogierUser,
        action: "expense.created",
        entityType: "expense",
        entityId: "exp-hockey",
        before: null,
        after: { amountCents: 30000 },
        createdAt: at(subDays(today, 4), "11:02"),
      },
      {
        id: "log-3",
        familyId: IDS.family,
        actorId: IDS.rogierUser,
        action: "change_request.created",
        entityType: "change_request",
        entityId: "cr-saturday",
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
        notes: "Later automatisch in te laden vanuit Nederlandse schoolvakanties.",
        createdAt,
        updatedAt: createdAt,
        createdBy: IDS.emmaUser,
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
  };
}

function nextWeekday(from: Date, weekday: number): Date {
  const date = new Date(from);
  const current = date.getDay();
  const delta = (weekday - current + 7) % 7 || 7;
  return addDays(date, delta);
}

function buildExpenses(today: Date): { expenses: Expense[]; splits: ExpenseSplit[] } {
  const createdAt = `${iso(subDays(today, 4))}T11:02:00`;
  const emma = IDS.emmaMember;
  const papa = IDS.rogierMember;

  const defs: Array<{
    id: string;
    description: string;
    amountCents: number;
    date: string;
    childId: string;
    category: "sport" | "kleding" | "school";
    paidByMemberId: string;
    percents: Record<string, number>;
    notes: string | null;
    createdBy: string;
  }> = [
    {
      id: "exp-hockey",
      description: "Hockeycontributie MHC",
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
      id: "exp-jas",
      description: "Winterjas Noah",
      amountCents: 7900,
      date: iso(subDays(today, 12)),
      childId: IDS.noah,
      category: "kleding" as const,
      paidByMemberId: emma,
      percents: { [papa]: 50, [emma]: 50 },
      notes: null,
      createdBy: IDS.emmaUser,
    },
    {
      id: "exp-schoolreis",
      description: "Schoolreis groep 5",
      amountCents: 4250,
      date: iso(subDays(today, 18)),
      childId: IDS.roxy,
      category: "school" as const,
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
        sharePercent: def.percents[memberId] ?? 0,
        paidAt: memberId === def.paidByMemberId ? createdAt : null,
        status: memberId === def.paidByMemberId ? "paid" : "pending",
      });
    }
  }

  return { expenses, splits };
}
