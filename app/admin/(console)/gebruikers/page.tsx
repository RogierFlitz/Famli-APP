import Link from "next/link";
import { filterUsers, loadAdminDirectory } from "@/lib/admin/directory";
import { adminHasCapability } from "@/lib/admin/roles";
import { requireAdmin } from "@/lib/admin/session";
import type { UserFilter } from "@/lib/admin/types";

const FILTERS: { id: UserFilter; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "active", label: "Actief" },
  { id: "blocked", label: "Geblokkeerd" },
  { id: "onboarding_open", label: "Onboarding open" },
  { id: "recent", label: "Recent" },
  { id: "microsoft", label: "Microsoft" },
  { id: "google", label: "Google" },
  { id: "no_family", label: "Geen gezin" },
  { id: "pending_invite", label: "Open uitnodiging" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const actor = await requireAdmin();
  const params = await searchParams;
  const filter = (FILTERS.some((item) => item.id === params.filter) ? params.filter : "all") as UserFilter;
  const q = params.q ?? "";
  const { users } = await loadAdminDirectory();
  const rows = filterUsers(users, filter, q);
  const canManage = adminHasCapability(actor.role, "manage_users");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Gebruikers</h1>
        {canManage ? (
          <Link
            href="/admin/gebruikers/nieuw"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            Gebruiker toevoegen
          </Link>
        ) : null}
      </div>
      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Naam, e-mail of user-id"
          className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input type="hidden" name="filter" value={filter} />
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">Zoeken</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.id}
            href={`/admin/gebruikers?filter=${item.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full px-3 py-1 text-xs ${filter === item.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Naam</th>
              <th className="px-3 py-2">E-mail</th>
              <th className="px-3 py-2">Geregistreerd</th>
              <th className="px-3 py-2">Laatste activiteit</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Gezin</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Onboarding</th>
              <th className="px-3 py-2">Providers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <Link href={`/admin/gebruikers/${row.id}`} className="font-medium text-slate-900 underline-offset-2 hover:underline">
                    {row.firstName} {row.lastName}
                  </Link>
                </td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">{new Date(row.createdAt).toLocaleDateString("nl-NL")}</td>
                <td className="px-3 py-2">
                  {row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleDateString("nl-NL") : "—"}
                </td>
                <td className="px-3 py-2">{row.accountStatus === "blocked" ? "Geblokkeerd" : "Actief"}</td>
                <td className="px-3 py-2">{row.familyName ?? "—"}</td>
                <td className="px-3 py-2">{row.familyRole ?? "—"}</td>
                <td className="px-3 py-2">{row.onboardingCompleted ? "Afgerond" : "Open"}</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {[row.googleConnected && "Google", row.microsoftConnected && "Microsoft", row.appleIcs && "Apple"]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Open een naam om het wachtwoord te wijzigen, te blokkeren of supportnotities te zetten.
      </p>
    </div>
  );
}
