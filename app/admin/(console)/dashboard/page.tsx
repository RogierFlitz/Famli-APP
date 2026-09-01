import { AdminDashboardCharts } from "@/components/admin/dashboard-charts";
import { emptyAdminStats, loadAdminDirectory } from "@/lib/admin/directory";
import { requireAdmin } from "@/lib/admin/session";

export default async function AdminDashboardPage() {
  await requireAdmin();
  let stats;
  try {
    ({ stats } = await loadAdminDirectory());
  } catch {
    stats = emptyAdminStats();
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">Metadata en technische status. Geen privé-gezinsinhoud.</p>
      </div>
      <AdminDashboardCharts stats={stats} />
    </div>
  );
}
