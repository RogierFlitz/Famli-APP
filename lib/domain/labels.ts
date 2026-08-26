import type {
  ChangeRequestType,
  DocumentCategory,
  EventCategory,
  ExpenseCategory,
  FamilyRole,
  MemberRelationType,
  NeededCategory,
  NeededItemLocation,
  NeededStatus,
  PermissionPreset,
  PlanId,
  TaskStatus,
} from "./types";

export const eventCategoryLabel: Record<EventCategory, string> = {
  verblijf: "Verblijf",
  overdracht: "Wisselmoment",
  school: "School",
  sport: "Sport",
  medisch: "Medisch",
  opvang: "Opvang",
  vakantie: "Vakantie",
  verjaardag: "Verjaardag",
  feestje: "Kinderfeestje",
  activiteit: "Afspraak",
  overig: "Notitie",
};

export const eventCategoryTone: Record<EventCategory, string> = {
  verblijf: "bg-[color:var(--famli-parent-1)]/15 text-[color:var(--famli-ink)]",
  overdracht: "bg-[color:var(--famli-important)]/15 text-[color:var(--famli-ink)]",
  school: "bg-[color:var(--famli-school)]/25 text-[color:var(--famli-ink)]",
  sport: "bg-[color:var(--famli-sport)]/20 text-[color:var(--famli-ink)]",
  medisch: "bg-[color:var(--famli-important)]/12 text-[color:var(--famli-ink)]",
  opvang: "bg-[color:var(--famli-child)]/20 text-[color:var(--famli-ink)]",
  vakantie: "bg-[color:var(--famli-parent-2)]/15 text-[color:var(--famli-ink)]",
  verjaardag: "bg-[color:var(--famli-child)]/22 text-[color:var(--famli-ink)]",
  feestje: "bg-[color:var(--famli-child)]/22 text-[color:var(--famli-ink)]",
  activiteit: "bg-[color:var(--famli-sport)]/15 text-[color:var(--famli-ink)]",
  overig: "bg-[color:var(--famli-bg)] text-[color:var(--famli-muted)]",
};

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  school: "School",
  kleding: "Kleding",
  sport: "Sport",
  medisch: "Medisch",
  opvang: "Opvang",
  activiteit: "Activiteit",
  zakgeld: "Zakgeld",
  overig: "Overig",
};

export const documentCategoryLabel: Record<DocumentCategory, string> = {
  identiteit: "Identiteit",
  school: "School",
  medisch: "Medisch",
  verzekering: "Verzekering",
  overeenkomst: "Overeenkomst",
  sport: "Sport",
  overig: "Overig",
};

export const changeRequestLabel: Record<ChangeRequestType, string> = {
  swap_day: "Dag ruilen",
  extra_day: "Extra dag",
  pickup: "Ophalen/brengen",
  pickup_time: "Tijd wijzigen",
  location: "Locatie wijzigen",
  vacation: "Vakantie aanpassen",
  other: "Anders",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "Open",
  done: "Afgerond",
};

export const roleLabel: Record<FamilyRole, string> = {
  owner: "Eigenaar",
  parent: "Ouder",
  guardian: "Gezinslid",
  viewer: "Alleen kijken",
};

export const relationTypeLabel: Record<MemberRelationType, string> = {
  ouder: "Ouder",
  partner: "Partner",
  bonusouder: "Bonusouder",
  opa_oma: "Opa/oma",
  verzorger: "Verzorger",
  oppas: "Oppas",
  anders: "Anders",
};

export const permissionPresetLabel: Record<PermissionPreset, string> = {
  practical: "Alleen praktisch",
  involved: "Betrokken bij gezin",
  custom: "Aangepast",
};

export const weekdayLabel: Record<number, string> = {
  1: "Ma",
  2: "Di",
  3: "Wo",
  4: "Do",
  5: "Vr",
  6: "Za",
  7: "Zo",
};

export const planLabel: Record<PlanId, string> = {
  free: "Free",
  plus: "Plus",
  family: "Family",
};

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

export const neededStatusLabel: Record<NeededStatus, string> = {
  nodig: "Nog kopen",
  wordt_geregeld: "Wordt geregeld",
  gekocht: "Gekocht",
  niet_meer_nodig: "Niet meer nodig",
};

export const neededCategoryLabel: Record<NeededCategory, string> = {
  kleding: "Kleding",
  schoenen: "Schoenen",
  school: "School",
  sport: "Sport",
  verzorging: "Verzorging",
  cadeau: "Cadeau",
  reizen: "Reizen",
  overig: "Overig",
};

export const neededLocationLabel: Record<NeededItemLocation, string> = {
  bij_papa: "Bij papa",
  bij_mama: "Bij mama",
  op_school: "Op school",
  bij_sportclub: "Bij sportclub",
  bij_oma: "Bij oma",
  bij_kind: "Bij kind",
  onderweg: "Onderweg",
  onbekend: "Onbekend",
  custom: "Andere locatie",
};

export const sizeFieldLabel: Record<string, string> = {
  clothing: "Kleding",
  shoes: "Schoenen",
  jacket: "Jas",
  trousers: "Broek",
  sport: "Sportkleding",
  helmet: "Fietshelm",
  other: "Overig",
};

export function notificationPrefLabel(key: string): string {
  const labels: Record<string, string> = {
    handoverReminder: "Overdracht morgen",
    changeRequest: "Wijzigingen",
    sport: "Sport en activiteiten",
    taskDue: "Taken die verlopen",
    expense: "Nieuwe gedeelde kosten",
    payment: "Betalingen",
  };
  return labels[key] ?? key;
}
