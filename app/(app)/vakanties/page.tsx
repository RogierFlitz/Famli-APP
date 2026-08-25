import { requireSnapshot } from "@/lib/auth/session";
import { createVacationAction, respondToVacationAction } from "@/lib/actions/calendar";
import { memberLabel } from "@/lib/custody/generate";
import { toISODate } from "@/lib/dates";

export default async function VacationsPage() {
  const snapshot = await requireSnapshot();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">Vakanties</h1>
        <p className="mt-2 text-[color:var(--nest-muted)]">
          Schoolvakanties, feestdagen en eigen periodes. Nederlandse schoolvakanties kunnen later automatisch worden ingeladen.
        </p>
      </header>

      <form action={createVacationAction} className="grid gap-2 rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5 md:grid-cols-2">
        <input name="title" required placeholder="Vakantie aanvragen" className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3 md:col-span-2" />
        <input name="startsOn" type="date" required defaultValue={toISODate(new Date())} className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
        <input name="endsOn" type="date" required className="h-12 rounded-2xl border border-[color:var(--nest-border)] px-3" />
        <textarea name="notes" placeholder="Toelichting" className="min-h-20 rounded-2xl border border-[color:var(--nest-border)] p-3 md:col-span-2" />
        <button className="h-12 rounded-full bg-[color:var(--nest-ink)] text-white md:col-span-2">Voorstel versturen</button>
      </form>

      <div className="space-y-3">
        {snapshot.vacations.map((vacation) => (
          <article key={vacation.id} className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--nest-muted)]">{vacation.kind} · {vacation.status}</p>
            <p className="text-lg font-medium">{vacation.title}</p>
            <p className="text-sm text-[color:var(--nest-muted)]">
              {vacation.startsOn} – {vacation.endsOn}
              {vacation.withMemberId ? ` · met ${memberLabel(snapshot.members, vacation.withMemberId).toLowerCase()}` : ""}
            </p>
            {vacation.status === "requested" && vacation.createdBy !== snapshot.currentProfile.id ? (
              <form action={respondToVacationAction} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={vacation.id} />
                <button name="accept" value="true" className="h-11 rounded-full bg-[color:var(--nest-ink)] px-4 text-white">Accepteren</button>
                <button name="accept" value="false" className="h-11 rounded-full border border-[color:var(--nest-border)] px-4">Niet deze keer</button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
