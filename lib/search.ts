import { formatDayLong } from "@/lib/dates";
import type { FamilySnapshot } from "@/lib/domain/types";

export type SearchHit = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

export function searchFamily(snapshot: FamilySnapshot, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];

  const push = (id: string, title: string, detail: string, href: string) => {
    const hay = `${title} ${detail}`.toLowerCase();
    if (hay.includes(q)) hits.push({ id, title, detail, href });
  };

  for (const child of snapshot.children) {
    const sizes = snapshot.sizes.find((item) => item.childId === child.id);
    push(child.id, child.firstName, [child.school, sizes?.shoes ? `schoenmaat ${sizes.shoes}` : null, sizes?.clothing].filter(Boolean).join(" · "), `/kinderen/${child.id}`);
    if (sizes) {
      push(`${child.id}-shoes`, `${child.firstName} schoenmaat`, sizes.shoes ?? "", `/kinderen/${child.id}?tab=informatie`);
      push(`${child.id}-kleding`, `${child.firstName} kledingmaat`, sizes.clothing ?? "", `/kinderen/${child.id}?tab=informatie`);
    }
    push(`${child.id}-passport`, `Paspoort ${child.firstName}`, child.passportExpiresOn ? `geldig tot ${formatDayLong(child.passportExpiresOn)}` : "", `/kinderen/${child.id}?tab=documenten`);
  }
  for (const event of snapshot.events.filter((item) => !item.cancelledAt)) {
    push(event.id, event.title, [event.location, formatDayLong(event.startsAt)].filter(Boolean).join(" · "), `/agenda?date=${event.startsAt.slice(0, 10)}&focus=${event.id}`);
  }
  for (const item of snapshot.neededItems) {
    const child = snapshot.children.find((row) => row.id === item.childId);
    push(item.id, item.title, [child?.firstName, item.size].filter(Boolean).join(" · "), `/kinderen/${item.childId}?tab=nodig`);
  }
  for (const plan of snapshot.travelPlans) {
    push(plan.id, plan.title, plan.destination, `/kinderen/${plan.childIds[0]}?tab=reizen`);
  }
  for (const party of snapshot.parties) {
    const event = snapshot.events.find((item) => item.id === party.eventId);
    if (event) push(party.id, event.title, party.hostName, `/agenda?date=${event.startsAt.slice(0, 10)}&focus=${event.id}`);
  }
  for (const doc of snapshot.documents) {
    if (snapshot.currentMember.role === "viewer" && (doc.sensitive || doc.category === "identiteit")) continue;
    push(doc.id, doc.title, doc.category, doc.childId ? `/kinderen/${doc.childId}?tab=documenten` : "/documenten");
  }

  const seen = new Set<string>();
  return hits.filter((hit) => {
    if (seen.has(hit.id)) return false;
    seen.add(hit.id);
    return true;
  }).slice(0, 12);
}
