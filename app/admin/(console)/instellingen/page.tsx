import { requireAdmin } from "@/lib/admin/session";
import { ADMIN_ROLE_LABEL } from "@/lib/admin/roles";

export default async function AdminSettingsPage() {
  const actor = await requireAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Instellingen</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p>
          Jouw rol: <strong>{ADMIN_ROLE_LABEL[actor.role]}</strong>
        </p>
        <p className="mt-2 text-slate-600">
          Adminrollen staan in <code>admin_staff</code> en worden server-side gecontroleerd. Eerste super-admin
          toevoegen via de Supabase SQL-editor:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
{`insert into public.admin_staff (user_id, role)
values ('<auth-user-uuid>', 'super_admin');`}
        </pre>
        <p className="mt-3 text-slate-600">
          Daarna migratie <code>0013_admin_portal.sql</code> uitvoeren als dat nog niet is gedaan. Service-role keys
          blijven server-only.
        </p>
      </div>
    </div>
  );
}
