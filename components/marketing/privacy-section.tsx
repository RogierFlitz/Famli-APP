import { Lock, ShieldCheck, UserCheck, Users } from "lucide-react";

import { MarketingSection, SectionHeading } from "@/components/marketing/marketing-primitives";

const points = [
  {
    icon: Lock,
    title: "Gezinsinformatie is privé",
    text: "Alleen mensen in jullie gezin kunnen meekijken — geen openbare profielen.",
  },
  {
    icon: UserCheck,
    title: "Alleen wat bedoeld is",
    text: "Leden zien wat voor hen relevant is, afgestemd op hun rol in het gezin.",
  },
  {
    icon: Users,
    title: "Rollen en rechten",
    text: "Niet iedereen hoeft alles te zien. Jullie bepalen wie wat mag doen.",
  },
  {
    icon: ShieldCheck,
    title: "Jullie gezin, jullie regels",
    text: "Geen gedeelde gezinsprofielen voor de buitenwereld — alleen voor jullie.",
  },
];

export function PrivacySection() {
  return (
    <MarketingSection id="privacy">
      <SectionHeading
        centered
        title="Jullie gezin. Jullie informatie."
        subtitle="Famli is gebouwd voor vertrouwen — zonder technisch gedoe op de voorpagina."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {points.map((point) => (
          <article
            key={point.title}
            className="rounded-[1.5rem] border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] p-5 shadow-[var(--famli-shadow-rest)]"
          >
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-[color:var(--famli-brand-soft)] text-[color:var(--famli-brand)]">
              <point.icon className="size-5" />
            </div>
            <h3 className="font-semibold">{point.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--famli-muted)]">{point.text}</p>
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
