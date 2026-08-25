import type {
  ChangeRequestType,
  DocumentCategory,
  EventCategory,
  ExpenseCategory,
  FamilyRole,
  PlanId,
  TaskStatus,
} from "./types";

export const eventCategoryLabel: Record<EventCategory, string> = {
  verblijf: "Thuis",
  overdracht: "Overdracht",
  school: "School",
  sport: "Sport",
  medisch: "Medisch",
  opvang: "Opvang",
  vakantie: "Vakantie",
  verjaardag: "Verjaardag",
  activiteit: "Activiteit",
  overig: "Overig",
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
  pickup_time: "Andere ophaaltijd",
  location: "Andere overdrachtslocatie",
  vacation: "Vakantie aanpassen",
  other: "Anders",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "Bezig",
  done: "Afgerond",
};

export const roleLabel: Record<FamilyRole, string> = {
  owner: "Eigenaar",
  parent: "Ouder",
  guardian: "Extra ouder",
  viewer: "Alleen kijken",
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
