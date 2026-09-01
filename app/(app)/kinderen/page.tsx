import Link from "next/link";
import { requireSnapshot } from "@/lib/auth/session";
import { childrenOverview } from "@/lib/queries/children-overview";
import { EmptyState } from "@/components/empty-state";
import { ChildOverviewCardView } from "@/components/children/child-overview-card";
import { AddChildForm } from "@/components/children/add-child-form";

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ nieuw?: string }>;
}) {
  const snapshot = await requireSnapshot();
  const { nieuw } = await searchParams;
  const overview = childrenOverview(snapshot);
  const showForm = overview.canAddChild && (nieuw === "1" || overview.cards.length === 0);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Kinderen</h1>
          <p className="mt-2 text-sm text-[color:var(--famli-muted)]">Alles rondom jullie kinderen op één plek.</p>
        </div>
        {overview.canAddChild && overview.cards.length > 0 ? (
          <Link href="/kinderen?nieuw=1" className="famli-btn famli-btn-secondary min-h-11 shrink-0 px-4 text-sm">
            + Kind toevoegen
          </Link>
        ) : null}
      </header>

      {overview.cards.length && (overview.summary.handoversToday || overview.summary.toArrange) ? (
        <p className="text-sm text-[color:var(--famli-muted)]">
          {[
            `${overview.summary.children} ${overview.summary.children === 1 ? "kind" : "kinderen"}`,
            overview.summary.handoversToday
              ? `${overview.summary.handoversToday} ${overview.summary.handoversToday === 1 ? "wissel" : "wissels"} vandaag`
              : null,
            overview.summary.toArrange
              ? `${overview.summary.toArrange} ${overview.summary.toArrange === 1 ? "ding" : "dingen"} te regelen`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      {overview.cards.length === 0 ? (
        <EmptyState
          title="Nog geen kinderen toegevoegd"
          body="Voeg jullie eerste kind toe om agenda’s, school, taken en afspraken op één plek bij te houden."
          actionHref="#nieuw-kind"
          actionLabel="Kind toevoegen"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {overview.cards.map((card) => (
            <ChildOverviewCardView key={card.child.id} card={card} />
          ))}
        </div>
      )}

      {showForm ? <AddChildForm lastName={snapshot.currentProfile.lastName} /> : null}
    </div>
  );
}
