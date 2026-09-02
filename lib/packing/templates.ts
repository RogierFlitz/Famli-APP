import type { EventCategory, PackingContext } from "@/lib/domain/types";

export const PACKING_TEMPLATES: Record<Exclude<PackingContext, "event" | "other">, string[]> = {
  hockey: ["Hockeystick", "Bitje", "Bidon"],
  gym: ["Gymtas"],
  zwemles: ["Zwemtas", "Handdoek"],
  school: ["Schooltas", "Boek"],
  handover: ["Schooltas", "Medicijnen", "Knuffel", "Sportspullen"],
};

export function inferPackingContext(title: string, category?: EventCategory | null): PackingContext {
  const hay = `${title} ${category ?? ""}`.toLowerCase();
  if (/hockey/.test(hay)) return "hockey";
  if (/gym|gymles|beweging/.test(hay)) return "gym";
  if (/zwem/.test(hay)) return "zwemles";
  if (/school|formulier|huiswerk/.test(hay)) return "school";
  if (/overdracht|wissel|handover/.test(hay) || category === "overdracht" || category === "verblijf") {
    return "handover";
  }
  if (category === "sport") return "event";
  return "other";
}

export function templateLabelsForContext(context: PackingContext): string[] {
  if (context === "event" || context === "other") return [];
  return PACKING_TEMPLATES[context];
}

export function packingListOrTemplate(
  title: string,
  category: EventCategory | null | undefined,
  explicit: string[],
): string[] {
  if (explicit.length) return explicit;
  return templateLabelsForContext(inferPackingContext(title, category));
}

export function handoverPackingOrTemplate(explicit: string[]): string[] {
  if (explicit.length) return explicit;
  return templateLabelsForContext("handover");
}
