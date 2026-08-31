import { getAdminActor } from "@/lib/admin/session";
import {
  signInAdmin,
  startDemoReadonlyAdmin,
  startDemoSuperAdmin,
  startDemoSupportAdmin,
} from "@/lib/admin/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await getAdminActor();
  if (actor) redirect("/admin/dashboard");
  const { error } = await searchParams;
  const supabase = isSupabaseConfigured();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-slate-500">Famli intern</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Beheeromgeving</h1>
        <p className="mt-2 text-sm text-slate-600">
          Alleen voor interne medewerkers. Dit is geen onderdeel van de gezinsapp.
        </p>
        {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

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

        {!supabase ? (
          <div className="mt-8 space-y-2">
            <p className="text-xs text-slate-500">Demo-beheerders (alleen lokaal):</p>
            <form action={startDemoSuperAdmin}>
              <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm">
                Isa Super <span className="float-right text-xs text-slate-400">super_admin</span>
              </button>
            </form>
            <form action={startDemoSupportAdmin}>
              <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm">
                Lars Support <span className="float-right text-xs text-slate-400">support_admin</span>
              </button>
            </form>
            <form action={startDemoReadonlyAdmin}>
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
