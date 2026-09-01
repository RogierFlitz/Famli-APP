import Link from "next/link";
import { adminHasCapability } from "@/lib/admin/roles";
import { requireAdmin } from "@/lib/admin/session";
import { redirect } from "next/navigation";

export default async function AdminNewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await requireAdmin();
  if (!adminHasCapability(actor.role, "manage_users")) redirect("/admin/gebruikers");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/admin/gebruikers" className="text-sm text-slate-500 hover:underline">
        ← Gebruikers
      </Link>
      <h1 className="text-2xl font-semibold">Gebruiker toevoegen</h1>
      <p className="text-sm text-slate-600">
        Dit account kan meteen inloggen in de gezinsapp. Er wordt nog geen gezin aangemaakt; dat doet de gebruiker in
        onboarding, of jij koppelt later.
      </p>
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      <form action="/admin/users/create" method="post" className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <label className="block text-sm">
          Voornaam
          <input name="firstName" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          Achternaam
          <input name="lastName" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          E-mailadres
          <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          Wachtwoord
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Wachtwoord bevestigen
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">Aanmaken</button>
      </form>
    </div>
  );
}
