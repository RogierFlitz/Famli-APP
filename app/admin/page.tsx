import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/admin/session";
import { signInAdmin, signOutFamilyForAdmin } from "@/lib/admin/actions";
import { isAdminBootstrapEnabled } from "@/lib/admin/bootstrap";
import { getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await getAdminActor();
  if (actor) redirect("/admin/dashboard");
  const familySession = await getSession();
  const { error } = await searchParams;
  const supabase = isSupabaseConfigured();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-slate-500">Famli intern</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Beheeromgeving</h1>
        <p className="mt-2 text-sm text-slate-600">
          Alleen voor interne medewerkers. Gebruik hetzelfde e-mailadres en wachtwoord als je Famli-account.
          Als er nog geen beheerder is, wordt dit account de eerste super-admin.
        </p>
        {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

        {familySession ? (
          <div className="mt-4 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-950">
            <p>
              Je bent ingelogd in de gezinsapp. Beheer gebruikt hetzelfde account: log hieronder opnieuw in, of log
              eerst uit.
            </p>
            <form action={signOutFamilyForAdmin} className="mt-3">
              <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                Uitloggen en beheer openen
              </button>
            </form>
          </div>
        ) : null}

        <form action={signInAdmin} className="mt-6 space-y-3">
          <label className="block text-sm">
            E-mailadres
            <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm">
            Wachtwoord
            <input
              name="password"
              type="password"
              required={supabase}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">Inloggen</button>
        </form>
        <p className="mt-4 text-sm">
          <Link href="/login/wachtwoord-vergeten" className="text-slate-600 underline">
            Wachtwoord vergeten?
          </Link>
        </p>

        {isAdminBootstrapEnabled() ? (
          <form action="/admin/bootstrap" method="post" className="mt-8 space-y-3 border-t border-slate-200 pt-6">
            <p className="text-xs text-slate-500">Tijdelijke toegang (tot staff-accounts klaar zijn)</p>
            <label className="block text-sm">
              Toegangscode
              <input name="secret" type="password" required minLength={16} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <button className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">
              Tijdelijk inloggen
            </button>
          </form>
        ) : null}

        {!supabase ? (
          <div className="mt-8 space-y-2">
            <p className="text-xs text-slate-500">Demo-beheerders (alleen lokaal):</p>
            <form action="/admin/demo" method="post">
              <input type="hidden" name="email" value="super@famli.internal" />
              <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm">
                Isa Super <span className="float-right text-xs text-slate-400">super_admin</span>
              </button>
            </form>
            <form action="/admin/demo" method="post">
              <input type="hidden" name="email" value="support@famli.internal" />
              <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm">
                Lars Support <span className="float-right text-xs text-slate-400">support_admin</span>
              </button>
            </form>
            <form action="/admin/demo" method="post">
              <input type="hidden" name="email" value="readonly@famli.internal" />
              <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm">
                Noor Inzicht <span className="float-right text-xs text-slate-400">readonly_admin</span>
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
