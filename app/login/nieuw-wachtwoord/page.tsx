import Link from "next/link";
import { FamliLogo } from "@/components/brand/logo";
import { FamliWash } from "@/components/brand/wash";
import { updatePasswordFromReset } from "@/lib/auth/actions";

export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <FamliWash>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <FamliLogo />
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">Nieuw wachtwoord</h1>
        <p className="mt-2 text-[color:var(--famli-muted)]">Kies een wachtwoord van minstens 8 tekens.</p>
        {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
        <form action={updatePasswordFromReset} className="mt-8 space-y-3">
          <label className="block text-sm">
            Nieuw wachtwoord
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className="famli-input mt-1" />
          </label>
          <label className="block text-sm">
            Bevestigen
            <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className="famli-input mt-1" />
          </label>
          <button className="famli-btn famli-btn-primary w-full">Wachtwoord opslaan</button>
        </form>
        <Link href="/login/wachtwoord-vergeten" className="mt-6 text-sm font-medium underline underline-offset-2">
          Nieuwe resetlink vragen
        </Link>
      </div>
    </FamliWash>
  );
}
