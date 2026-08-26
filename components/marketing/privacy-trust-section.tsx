import { Lock, Shield, Users } from "lucide-react";

import { MarketingSection, SectionHeading } from "@/components/marketing/marketing-primitives";

const points = [
  {
    icon: Shield,
    title: "Alleen jullie gezin",
    text: "Gegevens zijn afgeschermd per gezin. Niemand buiten jullie kring ziet jullie informatie.",
  },
  {
    icon: Users,
    title: "Jij bepaalt wie meekijkt",
    text: "Ouders, oppas, oma — iedereen krijgt precies de toegang die past bij hun rol.",
  },
  {
    icon: Lock,
    title: "Veilig opgeslagen",
    text: "Documenten en gezinsgegevens worden versleuteld bewaard, volgens moderne beveiligingsstandaarden.",
  },
];

export function PrivacyTrustSection() {
  return (
    <MarketingSection id="privacy">
      <SectionHeading centered title="Jullie gezin. Jullie informatie." />
      <div className="grid gap-4 md:grid-cols-3">
        {points.map((point) => (
          <article
            key={point.title}
            className="rounded-[1.75rem] border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] p-5 text-center shadow-[var(--famli-shadow-rest)]"
          >
            <div className="mx-auto mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-[color:var(--famli-brand-soft)] text-[color:var(--famli-brand)]">
              <point.icon className="size-5" />
            </div>
            <h3 className="text-lg font-semibold">{point.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--famli-muted)]">{point.text}</p>
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
