import { requireSnapshot } from "@/lib/auth/session";
import { planLabel, notificationPrefLabel } from "@/lib/domain/labels";
import { googleOAuthConfigured, microsoftOAuthConfigured } from "@/lib/calendar/config";
import { CalendarPrivacyPanel } from "@/components/settings/calendar-privacy";
import { CalendarExportPanel } from "@/components/settings/calendar-export";
import { FamilyMembersPanel } from "@/components/settings/family-members";
import { signOut } from "@/lib/auth/actions";
import { getRepository } from "@/lib/data";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string; connected?: string; error?: string }>;
}) {
  const snapshot = await requireSnapshot();
  const params = await searchParams;
  const ownConnections = snapshot.calendarConnections.filter(
    (item) => item.userId === snapshot.currentProfile.id,
  );
  const privacyConnection = ownConnections[0];
  const feedStatus = await getRepository().getCalendarFeedStatus(snapshot.currentProfile.id);

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
          Koppel je eigen agenda en kies wat andere gezinsleden mogen zien. Famli-gebeurtenissen blijven apart
          zichtbaar.
        </p>
        <CalendarPrivacyPanel
          privacyMode={privacyConnection?.privacyMode ?? "busy"}
          connections={ownConnections}
          userId={snapshot.currentProfile.id}
          flash={{
            provider: params.calendar,
            connected: params.connected === "1",
            error: params.error,
          }}
          oauthReady={{ google: googleOAuthConfigured(), microsoft: microsoftOAuthConfigured() }}
        />
      </section>

      <section className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Famli in jouw agenda</h2>
        <p className="mt-2 text-sm text-[color:var(--nest-muted)]">
          Zet Famli in Google Calendar, Apple Agenda of Outlook via een ICS-abonnement. Wijzigingen in
          Famli komen vanzelf in je eigen agenda.
        </p>
        <CalendarExportPanel hasFeed={Boolean(feedStatus)} />
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
