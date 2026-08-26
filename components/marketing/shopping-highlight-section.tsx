import { Check, Plus } from "lucide-react";

import {
  MarketingSection,
  MemberAvatar,
  SectionHeading,
} from "@/components/marketing/marketing-primitives";

const items = [
  { label: "Melk", done: false, by: "S", note: "Sophie voegde melk toe" },
  { label: "Brood", done: true, by: "T", note: "Thomas heeft brood afgevinkt" },
  { label: "Bananen", done: false, by: "E", note: "Toegevoegd door Emma" },
  { label: "Tandpasta", done: false, by: "T", note: "Toegevoegd door Thomas" },
];

export function ShoppingHighlightSection() {
  return (
    <MarketingSection tinted id="boodschappen">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading
            title="Boodschappen die echt live meebewegen"
            subtitle="Eén gedeelde lijst — iedereen voegt toe, vinkt af en ziet meteen wat nog nodig is."
          />
        </div>

        <div className="mx-auto w-full max-w-xs">
          <div className="rounded-[2.5rem] border-[6px] border-[color:var(--famli-ink)]/90 bg-[color:var(--famli-ink)] p-2 shadow-[var(--famli-shadow-lift)]">
            <div className="overflow-hidden rounded-[2rem] bg-[color:var(--famli-card)]">
              <div className="bg-[color:var(--famli-brand)] px-4 py-5 text-white">
                <p className="text-lg font-semibold">Boodschappen</p>
                <p className="text-sm opacity-90">Albert Heijn</p>
              </div>
              <ul className="divide-y divide-[color:var(--famli-border)] px-4 py-2">
                {items.map((item) => (
                  <li key={item.label} className="flex items-center gap-3 py-3">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-md border ${
                        item.done
                          ? "border-[color:var(--famli-brand)] bg-[color:var(--famli-brand)] text-white"
                          : "border-[color:var(--famli-border)]"
                      }`}
                    >
                      {item.done ? <Check className="size-3.5" /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${item.done ? "text-[color:var(--famli-muted)] line-through" : ""}`}
                      >
                        {item.label}
                      </p>
                      <p className="text-xs text-[color:var(--famli-muted)]">{item.note}</p>
                    </div>
                    <MemberAvatar initial={item.by} size="sm" />
                  </li>
                ))}
              </ul>
              <div className="border-t border-[color:var(--famli-border)] px-4 py-3">
                <div className="flex items-center gap-2 rounded-xl bg-[color:var(--famli-bg)] px-3 py-2.5 text-sm text-[color:var(--famli-muted)]">
                  <Plus className="size-4" />
                  Item toevoegen
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingSection>
  );
}
