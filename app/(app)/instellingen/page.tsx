import { requireSnapshot } from "@/lib/auth/session";
import { planLabel } from "@/lib/domain/labels";
import { googleOAuthConfigured, microsoftOAuthConfigured } from "@/lib/calendar/config";
import { CalendarPrivacyPanel } from "@/components/settings/calendar-privacy";
import { CalendarExportPanel } from "@/components/settings/calendar-export";
import { FamilyMembersPanel } from "@/components/settings/family-members";
import { NotificationPrefsForm } from "@/components/settings/notification-prefs";
import { signOut } from "@/lib/auth/actions";
import { getRepository } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { FamliMorgenPrefsForm } from "@/components/settings/famli-morgen-prefs";

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
  let feedStatus = null;
  try {
    feedStatus = await getRepository().getCalendarFeedStatus(snapshot.currentProfile.id);
  } catch {
    feedStatus = null;
  }

  return (
    <div className="famli-page max-w-[1120px]">
      <PageHeader
        title="Instellingen"
        subtitle={`${snapshot.family.name} · ${planLabel[snapshot.family.plan]} · ${snapshot.family.subscriptionStatus}`}
      />

      <FamilyMembersPanel snapshot={snapshot} />

      <section className="famli-card">
        <h2 className="text-xl font-semibold">Persoonlijke agenda</h2>
        <p className="mt-2 text-sm text-[color:var(--famli-muted)]">
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

      <section className="famli-card">
        <h2 className="text-xl font-semibold">Famli in jouw agenda</h2>
        <p className="mt-2 text-sm text-[color:var(--famli-muted)]">
          Zet Famli in Google Calendar, Apple Agenda of Outlook via een ICS-abonnement. Wijzigingen in
          Famli komen vanzelf in je eigen agenda.
        </p>
        <CalendarExportPanel hasFeed={Boolean(feedStatus)} />
      </section>

      <section className="famli-card">
        <h2 className="text-xl font-semibold">Famli Morgen</h2>
        <p className="mt-2 text-sm text-[color:var(--famli-muted)]">
          Wat jullie morgen moeten weten, gebundeld. Geen losse ping voor elk item.
        </p>
        <FamliMorgenPrefsForm snapshot={snapshot} />
      </section>

      <section className="famli-card">
        <h2 className="text-xl font-semibold">Notificaties</h2>
        <p className="mt-2 text-sm text-[color:var(--famli-muted)]">
          Jij bepaalt wat je ziet. E-mail sturen we later; de keuze staat al klaar.
        </p>
        <NotificationPrefsForm snapshot={snapshot} />
      </section>

      <section className="famli-card">
        <h2 className="text-xl font-semibold">Abonnement</h2>
        <p className="mt-2 text-sm text-[color:var(--famli-muted)]">
          Stripe volgt later. Nu: {planLabel[snapshot.family.plan]}, status {snapshot.family.subscriptionStatus}
          {snapshot.family.trialEnd ? `, trial tot ${snapshot.family.trialEnd.slice(0, 10)}` : ""}.
        </p>
      </section>

      <form action={signOut}>
        <button className="min-h-11 text-sm text-[color:var(--famli-muted)] underline">Uitloggen</button>
      </form>

      <p className="text-sm">
        <a href="/instellingen/beveiliging" className="text-[color:var(--famli-muted)] underline">
          Beveiligingsinstellingen
        </a>
      </p>
    </div>
  );
}
