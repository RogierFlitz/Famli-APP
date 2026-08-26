import { requireSnapshot } from "@/lib/auth/session";
import { generateOccurrences, memberLabel, yearNightCounts } from "@/lib/custody/generate";
import { addDaysIso, toISODate } from "@/lib/dates";
import { FamilyExportPanel } from "@/components/export/family-export";

export default async function YearOverviewPage() {
  const snapshot = await requireSnapshot();
  const year = new Date().getFullYear();
  const occurrences = snapshot.schedule
    ? generateOccurrences({
        schedule: snapshot.schedule,
        from: `${year}-01-01`,
        to: `${year}-12-31`,
        existing: snapshot.occurrences.filter((item) => item.isOverride),
      })
    : snapshot.occurrences;
  const nights = yearNightCounts(occurrences, year);
  const handovers = snapshot.handovers.filter((item) => item.date.startsWith(String(year)) && !item.cancelledAt);
  const vacationDays = snapshot.vacations
    .filter((item) => item.status !== "declined")
    .reduce((sum, item) => {
      const start = item.startsOn < `${year}-01-01` ? `${year}-01-01` : item.startsOn;
      const end = item.endsOn > `${year}-12-31` ? `${year}-12-31` : item.endsOn;
      if (start > end) return sum;
      let count = 0;
      let cursor = start;
      while (cursor <= end) {
        count += 1;
        cursor = addDaysIso(cursor, 1);
      }
      return sum + count;
    }, 0);
  const overrides = snapshot.occurrences.filter(
    (item) => item.isOverride && item.date.startsWith(String(year)),
  ).length;

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Verdeling dit jaar</h1>
      <p className="mt-2 max-w-xl text-[color:var(--nest-muted)]">
        Informatief, niet competitief. Gebaseerd op het schema en geaccepteerde wijzigingen.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {snapshot.members
          .filter((member) => member.role !== "viewer")
          .map((member) => (
            <article key={member.id} className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-6">
              <p className="text-[color:var(--nest-muted)]">{memberLabel(snapshot.members, member.id)}</p>
              <p className="font-[family-name:var(--font-display)] text-5xl">{nights[member.id] ?? 0}</p>
              <p className="text-sm text-[color:var(--nest-muted)]">nachten</p>
            </article>
          ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Stat label="Wisselmomenten" value={handovers.length} />
        <Stat label="Vakantiedagen" value={vacationDays} />
        <Stat label="Wijzigingen in het schema" value={overrides} />
      </div>
      <p className="mt-6 text-xs text-[color:var(--nest-muted)]">Peildatum {toISODate(new Date())}.</p>

      <div className="mt-8">
        <FamilyExportPanel />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
      <p className="text-sm text-[color:var(--nest-muted)]">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-3xl">{value}</p>
    </article>
  );
}
