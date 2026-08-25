import Link from "next/link";
import { FamliLogo } from "@/components/brand/logo";
import { FamliWash } from "@/components/brand/wash";
import { signUpLocal } from "@/lib/auth/actions";
import { famliBrand } from "@/lib/brand/tokens";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <FamliWash>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <FamliLogo />
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">Gratis beginnen</h1>
        <p className="mt-2 text-[color:var(--famli-muted)]">{famliBrand.sloganNl}</p>
        {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
        <form action={signUpLocal} className="mt-8 space-y-3">
          <label className="block text-sm">
            Voornaam
            <input name="firstName" required className="famli-input mt-1" />
          </label>
          <label className="block text-sm">
            Achternaam
            <input name="lastName" className="famli-input mt-1" />
          </label>
          <label className="block text-sm">
            E-mailadres
            <input name="email" type="email" required className="famli-input mt-1" />
          </label>
          <label className="block text-sm">
            Wachtwoord
            <input name="password" type="password" minLength={8} className="famli-input mt-1" />
          </label>
          <button className="famli-btn famli-btn-primary w-full">Gratis beginnen</button>
        </form>
        <p className="mt-6 text-sm text-[color:var(--famli-muted)]">
          Al een account?{" "}
          <Link href="/login" className="font-medium text-[color:var(--famli-ink)] underline underline-offset-2">
            Inloggen
          </Link>
        </p>
      </div>
    </FamliWash>
  );
}
