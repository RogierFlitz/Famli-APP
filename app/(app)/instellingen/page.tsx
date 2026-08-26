import { requireSnapshot } from "@/lib/auth/session";
import { planLabel, notificationPrefLabel } from "@/lib/domain/labels";
import { CalendarPrivacyPanel } from "@/components/settings/calendar-privacy";
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
        <CalendarPrivacyPanel privacyMode={connection?.privacyMode ?? "busy"} />
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

      <p className="text-sm">
        <a href="/instellingen/beveiliging" className="text-[color:var(--nest-muted)] underline">
          Beveiligingsinstellingen
        </a>
      </p>
    </div>
  );
}
