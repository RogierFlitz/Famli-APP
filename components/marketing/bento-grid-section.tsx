import {
  Bell,
  Calendar,
  FileText,
  Palmtree,
  Repeat2,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";

import { MarketingSection, SectionHeading } from "@/components/marketing/marketing-primitives";

const tiles = [
  {
    icon: Calendar,
    title: "Agenda",
    text: "School, sport, verjaardagen en afspraken — per kind en voor het hele gezin.",
    className: "md:col-span-2 md:row-span-1",
    accent: "from-[color:var(--famli-brand-soft)] to-white",
  },
  {
    icon: ShoppingCart,
    title: "Boodschappen",
    text: "Eén lijst, live bijgewerkt. Zie wie wat heeft toegevoegd of afgevinkt.",
    className: "md:col-span-1",
    accent: "from-[color:var(--famli-coral)]/15 to-white",
  },
  {
    icon: Sparkles,
    title: "Taken",
    text: "Ophalen, regelen, meenemen — duidelijk wie wat doet vandaag.",
    className: "md:col-span-1",
    accent: "from-[color:var(--famli-yellow)]/20 to-white",
  },
  {
    icon: Users,
    title: "Kinderen",
    text: "Per kind: school, sport, waar ze nu zijn en wat eraan komt.",
    className: "md:col-span-1",
    accent: "from-[color:var(--famli-sport)]/15 to-white",
  },
  {
    icon: Bell,
    title: "Herinneringen",
    text: "Gymschoenen, diploma's, medicijnen — op tijd, zonder stress.",
    className: "md:col-span-1",
    accent: "from-[color:var(--famli-important)]/12 to-white",
  },
  {
    icon: Palmtree,
    title: "Vakanties & reizen",
    text: "Alles rondom vakanties en reizen overzichtelijk bij elkaar.",
    className: "md:col-span-1",
    accent: "from-[color:var(--famli-brand-soft)] to-white",
  },
  {
    icon: FileText,
    title: "Documenten",
    text: "Belangrijke papieren veilig en vindbaar voor wie het mag zien.",
    className: "md:col-span-1",
    accent: "from-[color:var(--famli-school)]/15 to-white",
  },
  {
    icon: Repeat2,
    title: "Overdracht",
    text: "Wissels en overdrachten — met checklist zodat niets blijft liggen.",
    className: "md:col-span-2",
    accent: "from-[color:var(--famli-parent-1)]/12 to-[color:var(--famli-parent-2)]/10",
  },
];

export function BentoGridSection() {
  return (
    <MarketingSection id="functies">
      <SectionHeading
        centered
        title="Van maandagochtend tot zondagavond"
        subtitle="Alles wat een druk gezin nodig heeft — overzichtelijk verdeeld, nooit overweldigend."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {tiles.map((tile) => (
          <article
            key={tile.title}
            className={`group rounded-[1.75rem] border border-[color:var(--famli-border)] bg-gradient-to-br ${tile.accent} p-5 shadow-[var(--famli-shadow-rest)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--famli-shadow-lift)] ${tile.className}`}
          >
            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-[color:var(--famli-card)] text-[color:var(--famli-brand)] shadow-sm">
              <tile.icon className="size-5" />
            </div>
            <h3 className="text-lg font-semibold">{tile.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--famli-muted)]">{tile.text}</p>
          </article>
        ))}
      </div>
    </MarketingSection>
  );
}
