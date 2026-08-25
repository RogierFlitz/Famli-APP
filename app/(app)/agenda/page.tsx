import { requireSnapshot } from "@/lib/auth/session";
import { FamilyCalendar } from "@/components/calendar/family-calendar";

export default async function AgendaPage() {
  const snapshot = await requireSnapshot();
  return <FamilyCalendar snapshot={snapshot} />;
}
