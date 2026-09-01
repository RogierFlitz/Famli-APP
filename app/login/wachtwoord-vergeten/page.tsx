import Link from "next/link";
import { FamliLogo } from "@/components/brand/logo";
import { FamliWash } from "@/components/brand/wash";
import { requestPasswordReset } from "@/lib/auth/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <FamliWash>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <FamliLogo />
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">Wachtwoord vergeten</h1>
        <p className="mt-2 text-[color:var(--famli-muted)]">
          Vul je e-mailadres in. Als er een account bestaat, sturen we een resetlink.
        </p>
        {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
        {sent ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Controleer je e-mail voor de resetlink. Die is een uur geldig.
          </p>
        ) : null}
        <form action={requestPasswordReset} className="mt-8 space-y-3">
          <label className="block text-sm">
            E-mailadres
            <input name="email" type="email" required autoComplete="email" className="famli-input mt-1" />
          </label>
          <button className="famli-btn famli-btn-primary w-full">Stuur resetlink</button>
        </form>
        <Link href="/login" className="mt-6 text-sm font-medium underline underline-offset-2">
          Terug naar inloggen
        </Link>
      </div>
    </FamliWash>
  );
}
