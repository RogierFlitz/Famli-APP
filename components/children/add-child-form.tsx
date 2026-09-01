import { addChildFromOverviewAction } from "@/lib/actions/onboarding";

export function AddChildForm({ lastName }: { lastName: string }) {
  return (
    <form id="nieuw-kind" action={addChildFromOverviewAction} className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-4">
      <input type="hidden" name="from" value="kinderen" />
      <p className="text-sm font-medium">Kind toevoegen</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Voornaam
          <input name="firstName" required className="famli-input mt-1" />
        </label>
        <label className="text-sm">
          Achternaam
          <input name="lastName" defaultValue={lastName} className="famli-input mt-1" />
        </label>
        <label className="text-sm sm:col-span-2">
          Geboortedatum
          <input name="dateOfBirth" type="date" required className="famli-input mt-1" />
        </label>
      </div>
      <button className="famli-btn famli-btn-primary mt-4 min-h-11 px-4 text-sm">Kind toevoegen</button>
    </form>
  );
}
