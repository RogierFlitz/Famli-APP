import { requireSnapshot } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SecuritySettingsPage() {
  const snapshot = await requireSnapshot();
  let emailConfirmed = snapshot.currentProfile.email.includes("@");
  let mfaEnabled = false;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    emailConfirmed = Boolean(data.user?.email_confirmed_at);
    mfaEnabled = (data.user?.factors?.length ?? 0) > 0;
  }

  return (
    <div className="space-y-8">
      <header>
        <Link href="/instellingen" className="text-sm text-[color:var(--nest-muted)] underline">
          ← Terug naar instellingen
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">Beveiliging</h1>
        <p className="mt-1 text-[color:var(--nest-muted)]">
          Account, sessies en tweefactorauthenticatie
        </p>
      </header>

      <section className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[color:var(--nest-muted)]">E-mail</dt>
            <dd>{snapshot.currentProfile.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[color:var(--nest-muted)]">E-mail bevestigd</dt>
            <dd>{emailConfirmed ? "Ja" : "Nog niet — controleer je inbox"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-[color:var(--nest-muted)]">
          Wachtwoord wijzigen en e-mailverificatie worden afgehandeld via Supabase Auth zodra geconfigureerd.
        </p>
      </section>

      <section className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Tweefactorauthenticatie (2FA)</h2>
        <p className="mt-2 text-sm text-[color:var(--nest-muted)]">
          {mfaEnabled
            ? "TOTP is ingeschakeld op je account."
            : "2FA is nog niet ingeschakeld. Schakel TOTP in via het Supabase-dashboard of een toekomstige setup-flow."}
        </p>
        <button
          disabled
          className="mt-4 h-11 rounded-full border border-[color:var(--nest-border)] px-4 text-sm opacity-60"
        >
          2FA instellen (binnenkort)
        </button>
      </section>

      <section className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Sessies</h2>
        <p className="mt-2 text-sm text-[color:var(--nest-muted)]">
          Actieve sessies worden beheerd via Supabase Auth cookies. Uitloggen beëindigt je huidige sessie op dit apparaat.
        </p>
      </section>

      <section className="rounded-3xl border border-[color:var(--nest-border)] bg-[color:var(--nest-card)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Account verwijderen</h2>
        <p className="mt-2 text-sm text-[color:var(--nest-muted)]">
          Neem contact op met support om je account en gezinsgegevens te laten verwijderen. Zelfservice volgt na GDPR-procedure.
        </p>
        <button
          disabled
          className="mt-4 h-11 rounded-full border border-red-300 px-4 text-sm text-red-700 opacity-60"
        >
          Account verwijderen (binnenkort)
        </button>
      </section>
    </div>
  );
}
