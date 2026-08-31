import { formatEuro } from "@/lib/money";
import { costStats } from "@/lib/costs/stats";
import type { FamilySnapshot } from "@/lib/domain/types";

export function CostStats({ snapshot }: { snapshot: FamilySnapshot }) {
  const stats = costStats(snapshot);
  const tiles = [
    { label: "Deze maand totaal", value: formatEuro(stats.monthTotal) },
    { label: "Door mij betaald", value: formatEuro(stats.paidByMe) },
    { label: `Door ${stats.otherName} betaald`, value: formatEuro(stats.paidByOther) },
    { label: "Openstaand saldo", value: formatEuro(stats.outstanding) },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-2xl bg-[color:var(--famli-bg)] px-4 py-3">
          <p className="text-xs text-[color:var(--famli-muted)]">{tile.label}</p>
          <p className="mt-1 text-lg font-semibold">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}
