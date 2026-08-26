import { requireSnapshot } from "@/lib/auth/session";
import { costHeadline } from "@/lib/queries/family-view";
import { ExpenseForm } from "@/components/compose/add-menu";
import { CostList } from "@/components/costs/cost-list";

export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const snapshot = await requireSnapshot();
  const { id } = await searchParams;
  const headline = costHeadline(snapshot);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Kosten</h1>
        <p className="mt-3 text-3xl font-semibold text-[color:var(--famli-brand)]">{headline.title}</p>
        <p className="mt-1 text-[color:var(--famli-muted)]">{headline.subtitle}</p>
      </header>

      <CostList snapshot={snapshot} focusId={id} />

      <section id="toevoegen" className="famli-card">
        <h2 className="mb-4 text-xl font-semibold">Kosten toevoegen</h2>
        <ExpenseForm snapshot={snapshot} />
      </section>
    </div>
  );
}
