import Link from "next/link";
import { loadAdminDirectory } from "@/lib/admin/directory";
import { requireAdmin } from "@/lib/admin/session";

export default async function AdminFamiliesPage() {
  await requireAdmin();
  const { families } = await loadAdminDirectory();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Gezinnen</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Gezin</th>
              <th className="px-3 py-2">Hoofdgebruiker</th>
              <th className="px-3 py-2">Leden</th>
              <th className="px-3 py-2">Kinderen</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Aangemaakt</th>
            </tr>
          </thead>
          <tbody>
            {families.map((family) => (
              <tr key={family.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <Link href={`/admin/gezinnen/${family.id}`} className="font-medium hover:underline">
                    {family.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{family.ownerEmail ?? "—"}</td>
                <td className="px-3 py-2">{family.memberCount}</td>
                <td className="px-3 py-2">{family.childCount}</td>
                <td className="px-3 py-2">
                  {family.plan} / {family.subscriptionStatus}
                </td>
                <td className="px-3 py-2">{new Date(family.createdAt).toLocaleDateString("nl-NL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
