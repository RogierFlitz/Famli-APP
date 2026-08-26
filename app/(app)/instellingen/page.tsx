import { requireSnapshot } from "@/lib/auth/session";
import { calendarProviders } from "@/lib/calendar/providers";
import { planLabel, notificationPrefLabel } from "@/lib/domain/labels";
import { updateCalendarPrivacyAction } from "@/lib/actions/family";
import { FamilyMembersPanel } from "@/components/settings/family-members";
import { signOut } from "@/lib/auth/actions";

export default async function SettingsPage() {
  const snapshot = await requireSnapshot();
  const connection = snapshot.calendarConnections.find(
    (item) => item.userId === snapshot.currentProfile.id,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">Instellingen</h1>
        <p className="mt-1 text-[color:var(--nest-muted)]">
          {snapshot.family.name} · {planLabel[snapshot.family.plan]} · {snapshot.family.subscriptionStatus}
        </p>
      </header>

      <FamilyMembersPanel snapshot={snapshot} />

      <section className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Persoonlijke agenda</h2>
        <p className="mt-2 text-sm text-[color:var(--nest-muted)]">
          Een persoonlijke agenda mag gekoppeld worden zonder dat de andere ouder privé-informatie ziet.
        </p>
        <form action={updateCalendarPrivacyAction} className="mt-4 space-y-3">
          <p className="text-sm font-medium">Persoonlijke afspraken tonen als</p>
          {[
            ["full", "Volledige afspraak"],
            ["busy", 'Alleen "Bezet"'],
            ["hidden", "Helemaal niet delen"],
          ].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="privacyMode" value={value} defaultChecked={(connection?.privacyMode ?? "busy") === value} />
              {label}
            </label>
          ))}
          <button className="h-11 rounded-full border border-[color:var(--nest-border)] px-4">Opslaan</button>
        </form>
        <div className="mt-6 space-y-3">
          {calendarProviders.map((provider) => (
            <div key={provider.id} className="rounded-2xl bg-[color:var(--nest-bg)] p-4">
              <p className="font-medium">{provider.label}</p>
              <p className="text-sm text-[color:var(--nest-muted)]">{provider.description}</p>
              <button disabled className="mt-2 h-10 rounded-full border border-[color:var(--nest-border)] px-4 text-sm opacity-60">
                Koppelen volgt na OAuth-setup
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Notificaties</h2>
        <p className="mt-2 text-sm text-[color:var(--nest-muted)]">
          Architectuur is klaar voor in-app, e-mail en push. Jij bepaalt per categorie wat je krijgt.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {Object.entries(snapshot.currentProfile.notificationPrefs).map(([key, value]) => (
            <li key={key} className="flex justify-between">
              <span>{notificationPrefLabel(key)}</span>
              <span className="text-[color:var(--nest-muted)]">
                {value.inApp ? "in-app" : ""} {value.email ? "e-mail" : ""} {value.push ? "push" : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Abonnement</h2>
        <p className="mt-2 text-sm text-[color:var(--nest-muted)]">
          Stripe volgt later. Nu: {planLabel[snapshot.family.plan]}, status {snapshot.family.subscriptionStatus}
          {snapshot.family.trialEnd ? `, trial tot ${snapshot.family.trialEnd.slice(0, 10)}` : ""}.
        </p>
      </section>

      <form action={signOut}>
        <button className="h-11 text-sm text-[color:var(--nest-muted)] underline">Uitloggen</button>
      </form>
    </div>
  );
}
