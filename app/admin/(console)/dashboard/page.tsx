import { loadAdminDirectory } from "@/lib/admin/directory";
import { requireAdmin } from "@/lib/admin/session";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const { stats } = await loadAdminDirectory();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">Metadata en technische status. Geen privé-gezinsinhoud.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gebruikers" value={stats.userCount} />
        <Stat label="Gezinnen" value={stats.familyCount} />
        <Stat label="Kinderen" value={stats.childCount} />
        <Stat label="Onboarding afgerond" value={`${stats.onboardingCompletedPct}%`} />
        <Stat label="Actief 7 dagen" value={stats.active7d} />
        <Stat label="Actief 30 dagen" value={stats.active30d} />
        <Stat label="Registraties vandaag" value={stats.registrationsToday} />
        <Stat label="Registraties deze week" value={stats.registrationsWeek} />
        <Stat label="Open uitnodigingen" value={stats.pendingInvites} />
        <Stat label="Agenda gekoppeld" value={stats.connectedCalendars} />
        <Stat label="Betaalde gezinnen" value={stats.payingCount} />
        <Stat label="Gratis gezinnen" value={stats.freeCount} />
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Registraties laatste 7 dagen</h2>
        <div className="mt-4 flex h-24 items-end gap-2">
          {stats.registrationsLast7Days.map((count, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-slate-800"
                style={{ height: `${Math.max(4, count * 16)}px` }}
                title={`${count}`}
              />
              <span className="text-[10px] text-slate-500">{count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
