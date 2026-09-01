import type { AdminDashboardStats } from "@/lib/admin/types";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SplitBar({
  title,
  parts,
}: {
  title: string;
  parts: { label: string; value: number; color: string }[];
}) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
        {total === 0 ? (
          <div className="h-full w-full bg-slate-200" />
        ) : (
          parts.map((part) =>
            part.value ? (
              <div
                key={part.label}
                className={part.color}
                style={{ width: `${(part.value / total) * 100}%` }}
                title={`${part.label}: ${part.value}`}
              />
            ) : null,
          )
        )}
      </div>
      <ul className="mt-3 space-y-1 text-sm text-slate-600">
        {parts.map((part) => (
          <li key={part.label} className="flex justify-between">
            <span>{part.label}</span>
            <span className="tabular-nums">{part.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminDashboardCharts({ stats }: { stats: AdminDashboardStats }) {
  const max = Math.max(1, ...stats.registrationsLast7Days);
  return (
    <div className="space-y-6">
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
        <div className="mt-4 flex h-44 items-end gap-2">
          {stats.registrationsLast7Days.map((count, index) => (
            <div key={`${stats.registrationDayLabels[index]}-${index}`} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[11px] tabular-nums text-slate-500">{count}</span>
              <div
                className="w-full rounded-t bg-slate-800"
                style={{ height: `${Math.max(8, (count / max) * 140)}px` }}
              />
              <span className="text-[10px] capitalize text-slate-500">{stats.registrationDayLabels[index]}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <SplitBar
          title="Onboarding"
          parts={[
            { label: "Afgerond", value: stats.onboardedCount, color: "bg-emerald-600" },
            { label: "Open", value: stats.openOnboardingCount, color: "bg-amber-400" },
          ]}
        />
        <SplitBar
          title="Accounts"
          parts={[
            { label: "Actief", value: Math.max(0, stats.userCount - stats.blockedCount), color: "bg-slate-800" },
            { label: "Geblokkeerd", value: stats.blockedCount, color: "bg-rose-500" },
          ]}
        />
        <SplitBar
          title="Gezin koppeling"
          parts={[
            { label: "In een gezin", value: stats.withFamilyCount, color: "bg-sky-600" },
            { label: "Zonder gezin", value: stats.noFamilyCount, color: "bg-slate-300" },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SplitBar
          title="Abonnementen"
          parts={[
            { label: "Betaald / actief", value: stats.payingCount, color: "bg-violet-600" },
            { label: "Gratis", value: stats.freeCount, color: "bg-slate-300" },
          ]}
        />
        <SplitBar
          title="Activiteit"
          parts={[
            { label: "Actief 7 dagen", value: stats.active7d, color: "bg-slate-900" },
            { label: "Actief 8–30 dagen", value: Math.max(0, stats.active30d - stats.active7d), color: "bg-slate-500" },
            {
              label: "Langer stil",
              value: Math.max(0, stats.userCount - stats.active30d),
              color: "bg-slate-200",
            },
          ]}
        />
      </div>
    </div>
  );
}
