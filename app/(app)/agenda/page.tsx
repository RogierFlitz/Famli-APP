import { requireSnapshot } from "@/lib/auth/session";
import { FamilyCalendar } from "@/components/calendar/family-calendar";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; focus?: string }>;
}) {
  const snapshot = await requireSnapshot();
  const params = await searchParams;
  return (
    <FamilyCalendar
      snapshot={snapshot}
      initialDate={params.date}
      initialView={params.view}
      focusId={params.focus}
    />
  );
}
