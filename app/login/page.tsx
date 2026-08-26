import Link from "next/link";
import { FamliLogo } from "@/components/brand/logo";
import { FamliWash } from "@/components/brand/wash";
import { startDemoEmma, startDemoRogier, startDemoSanne, signInLocal } from "@/lib/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { famliBrand } from "@/lib/brand/tokens";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = isSupabaseConfigured();

  return (
    <FamliWash>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <FamliLogo />
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">Welkom bij Famli</h1>
        <p className="mt-2 text-lg text-[color:var(--famli-ink)]">{famliBrand.sloganNl}</p>
        {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

        <form action={signInLocal} className="mt-8 space-y-3">
          <label className="block text-sm">
            E-mailadres
            <input name="email" type="email" required autoComplete="email" className="famli-input mt-1" />
          </label>
          <label className="block text-sm">
            Wachtwoord
            <input
              name="password"
              type="password"
              required={supabase}
              autoComplete="current-password"
              className="famli-input mt-1"
            />
          </label>
          <button className="famli-btn famli-btn-primary w-full">Inloggen</button>
        </form>

        <p className="mt-8 text-center text-sm text-[color:var(--famli-muted)]">Nog geen account?</p>
        <Link href="/signup" className="famli-btn famli-btn-secondary mt-2 w-full">
          Gratis beginnen
        </Link>

        {!supabase ? (
          <div className="mt-10">
            <p className="text-sm text-[color:var(--famli-muted)]">Bekijk Famli met een voorbeeldgezin:</p>
            <div className="mt-3 space-y-2">
              <form action={startDemoEmma}>
                <button className="famli-btn famli-btn-secondary w-full justify-between">
                  <span>Emma (mama)</span>
                  <span className="text-xs text-[color:var(--famli-muted)]">Eigenaar</span>
                </button>
              </form>
              <form action={startDemoRogier}>
                <button className="famli-btn famli-btn-secondary w-full justify-between">
                  <span>Rogier (papa)</span>
                  <span className="text-xs text-[color:var(--famli-muted)]">Ouder</span>
                </button>
              </form>
              <form action={startDemoSanne}>
                <button className="famli-btn famli-btn-secondary w-full justify-between">
                  <span>Sanne (partner)</span>
                  <span className="text-xs text-[color:var(--famli-muted)]">Partner Rogier</span>
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </FamliWash>
  );
}
