import { CalendarDays, HeartHandshake, Users } from "lucide-react";

import {
  MarketingSection,
  MemberAvatar,
  PreviewCard,
  SectionHeading,
} from "@/components/marketing/marketing-primitives";

const pillars = [
  {
    icon: CalendarDays,
    title: "Vandaag",
    tagline: "Zie direct wat er vandaag speelt.",
    text: "Agenda, school, sport, afspraken, ophalen en wat mee moet.",
    preview: (
      <div className="space-y-2 text-sm">
        <div className="rounded-xl bg-[color:var(--famli-parent-1)]/25 p-2.5">
          <p className="text-xs text-[color:var(--famli-muted)]">15:15</p>
          <p className="font-medium">Papa haalt Mila op</p>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-[color:var(--famli-bg)] p-2.5">
          <span>17:00 · Hockeytraining</span>
          <MemberAvatar initial="M" size="sm" />
        </div>
      </div>
    ),
  },
  {
    icon: HeartHandshake,
    title: "Samen regelen",
    tagline: "Niet meer alles via WhatsApp onthouden.",
    text: "Taken, boodschappen, herinneringen en afspraken staan op één gezamenlijke plek.",
    preview: (
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-xl bg-[color:var(--famli-bg)] p-2.5">
          <span>Melk</span>
          <MemberAvatar initial="S" size="sm" />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-[color:var(--famli-bg)] p-2.5">
          <span className="line-through text-[color:var(--famli-muted)]">Brood</span>
          <MemberAvatar initial="T" size="sm" />
        </div>
      </div>
    ),
  },
  {
    icon: Users,
    title: "Elk gezin past",
    tagline: "Één gezin. Ook met meerdere huizen.",
    text: "Famli werkt voor gezinnen die samenwonen én voor co-ouders, nieuwe partners en samengestelde gezinnen.",
    preview: (
      <div className="flex items-center justify-center gap-2 py-2">
        <MemberAvatar initial="E" />
        <MemberAvatar initial="T" />
        <MemberAvatar initial="L" />
        <MemberAvatar initial="M" />
        <MemberAvatar initial="N" />
      </div>
    ),
  },
];

export function ThreePillarsSection() {
  return (
    <MarketingSection id="pillars">
      <SectionHeading
        title="Drie pijlers voor een rustigere dag"
        subtitle="Famli brengt overzicht, samenwerking en flexibiliteit samen."
      />
      <div className="grid gap-5 md:grid-cols-3">
        {pillars.map((pillar) => (
          <PreviewCard key={pillar.title} className="flex h-full flex-col">
            <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-[color:var(--famli-brand-soft)] text-[color:var(--famli-brand)]">
              <pillar.icon className="size-5" />
            </div>
            <h3 className="text-xl font-semibold">{pillar.title}</h3>
            <p className="mt-1 text-sm font-medium text-[color:var(--famli-ink)]">{pillar.tagline}</p>
            <p className="mt-2 flex-1 text-sm leading-6 text-[color:var(--famli-muted)]">
              {pillar.text}
            </p>
            <div className="mt-4">{pillar.preview}</div>
          </PreviewCard>
        ))}
      </div>
    </MarketingSection>
  );
}
