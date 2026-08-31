"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { formatEuro } from "@/lib/money";
import { namedCostHeadline } from "@/lib/costs/stats";
import { settleOpenExpensesAction } from "@/lib/actions/family-hub";
import type { FamilySnapshot } from "@/lib/domain/types";

export function SettlePanel({ snapshot }: { snapshot: FamilySnapshot }) {
  const headline = namedCostHeadline(snapshot);
  const [pending, start] = useTransition();
  if (headline.net === 0) return null;

  return (
    <section className="famli-card space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Kosten verrekenen</h2>
        <p className="mt-1 text-sm text-[color:var(--famli-muted)]">
          {headline.title} ({formatEuro(Math.abs(headline.net))}). Markeer alle openstaande posten als
          afgerond als jullie dit buiten Famli hebben verrekend.
        </p>
      </div>
      <form
        action={(formData) => {
          start(async () => {
            try {
              await settleOpenExpensesAction(formData);
              toast.success("Kosten verrekend");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Verrekenen mislukt");
            }
          });
        }}
      >
        <label className="block text-sm">
          Opmerking (optioneel)
          <input name="note" className="famli-input mt-1" placeholder="Bijv. overgemaakt via bank" />
        </label>
        <button type="submit" disabled={pending} className="famli-btn famli-btn-primary mt-3 h-11 px-4">
          {pending ? "Bezig…" : "Alles verrekenen"}
        </button>
      </form>
    </section>
  );
}
