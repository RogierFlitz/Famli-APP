import { requireSnapshot } from "@/lib/auth/session";
import { namedCostHeadline } from "@/lib/costs/stats";
import { ExpenseForm } from "@/components/compose/add-menu";
import { CostList } from "@/components/costs/cost-list";
import { CostStats } from "@/components/costs/cost-stats";
import { SettlePanel } from "@/components/costs/settle-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; expense?: string }>;
}) {
  const snapshot = await requireSnapshot();
  const params = await searchParams;
  const id = params.id ?? params.expense;
  const headline = namedCostHeadline(snapshot);

  return (
    <div className="famli-page">
      <PageHeader title="Kosten" subtitle={headline.subtitle} />
      <p className="text-3xl font-semibold tracking-tight text-[color:var(--famli-ink)]">{headline.title}</p>

      <CostStats snapshot={snapshot} />
      <SettlePanel snapshot={snapshot} />
      <CostList snapshot={snapshot} focusId={id} />

      <section id="toevoegen" className="famli-card">
        <h2 className="mb-4 text-xl font-semibold">Kosten toevoegen</h2>
        <ExpenseForm snapshot={snapshot} />
      </section>
    </div>
  );
}
