import { assignAdminRole } from "@/lib/admin/actions";
import { listDemoStaff } from "@/lib/admin/memory";
import { ADMIN_ROLE_LABEL, adminHasCapability, ADMIN_ROLES } from "@/lib/admin/roles";
import { requireAdmin } from "@/lib/admin/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";

export default async function AdminSettingsPage() {
  const actor = await requireAdmin();
  const staff = isSupabaseConfigured() ? [] : listDemoStaff();
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

      {adminHasCapability(actor.role, "manage_admin_roles") && staff.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Staffrollen (demo)</h2>
          <ul className="mt-3 space-y-3">
            {staff.map((member) => (
              <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {member.name} · {ADMIN_ROLE_LABEL[member.role]}
                </span>
                {member.userId !== actor.userId ? (
                  <ConfirmActionForm
                    action={assignAdminRole}
                    title="Rol wijzigen"
                    confirmLabel="Opslaan"
                    extraFields={
                      <>
                        <input type="hidden" name="userId" value={member.userId} />
                        <label className="block text-xs">
                          Nieuwe rol
                          <select name="role" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1">
                            {ADMIN_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ADMIN_ROLE_LABEL[role]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    }
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
