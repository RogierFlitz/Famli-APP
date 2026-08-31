import { loadAuditLog } from "@/lib/admin/logs";
import { requireAdmin } from "@/lib/admin/session";

export default async function AdminAuditPage() {
  await requireAdmin();
  const entries = await loadAuditLog();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Auditlog</h1>
      <p className="text-sm text-slate-500">Alleen zichtbaar voor ingelogde admins. Geen wachtwoorden of tokens.</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Tijd</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2">Actie</th>
              <th className="px-3 py-2">Doel</th>
              <th className="px-3 py-2">Reden</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-slate-100">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString("nl-NL")}</td>
                <td className="px-3 py-2">{entry.adminName}</td>
                <td className="px-3 py-2 font-mono text-xs">{entry.action}</td>
                <td className="px-3 py-2 font-mono text-xs">{entry.targetUserId ?? entry.familyId ?? "—"}</td>
                <td className="px-3 py-2">{entry.reason ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={5}>
                  Nog geen auditregels.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
