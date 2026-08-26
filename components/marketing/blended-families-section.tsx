import { Check, Minus } from "lucide-react";

import {
  MarketingSection,
  MemberAvatar,
  PreviewCard,
  SectionHeading,
} from "@/components/marketing/marketing-primitives";

const family = [
  { name: "Emma", role: "ouder", initial: "E" },
  { name: "Thomas", role: "ouder", initial: "T" },
  { name: "Lisa", role: "partner", initial: "L" },
  { name: "Mila", role: "kind", initial: "M" },
  { name: "Noah", role: "kind", initial: "N" },
];

const permissions = [
  { label: "Agenda bekijken", allowed: true },
  { label: "Boodschappen toevoegen", allowed: true },
  { label: "Taken uitvoeren", allowed: true },
  { label: "Privé-afspraken ouders", allowed: false },
];

export function BlendedFamiliesSection() {
  return (
    <MarketingSection tinted id="gezinnen">
      <SectionHeading
        title="Jullie gezin hoeft niet in één huis te wonen."
        subtitle="Famli past zich aan jullie gezin aan. Ouders, co-ouders en nieuwe partners kunnen samenwerken zonder dat iedereen automatisch alles hoeft te zien."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <PreviewCard>
          <p className="mb-4 text-sm font-semibold text-[color:var(--famli-muted)]">Gezin</p>
          <ul className="space-y-2 font-mono text-sm">
            {family.map((member, index) => (
              <li key={member.name} className="flex items-center gap-3 rounded-xl bg-[color:var(--famli-bg)] px-3 py-2.5">
                <span className="w-4 text-[color:var(--famli-muted)]">
                  {index === family.length - 1 ? "└" : "├"}
                </span>
                <MemberAvatar initial={member.initial} size="sm" />
                <span>
                  <span className="font-medium font-sans">{member.name}</span>
                  <span className="font-sans text-[color:var(--famli-muted)]"> — {member.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </PreviewCard>

        <PreviewCard>
          <div className="mb-4 flex items-center gap-3">
            <MemberAvatar initial="L" />
            <div>
              <p className="font-semibold">Lisa</p>
              <p className="text-sm text-[color:var(--famli-muted)]">Partner · beperkte toegang</p>
            </div>
          </div>
          <ul className="space-y-2">
            {permissions.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between rounded-xl bg-[color:var(--famli-bg)] px-3 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  {item.allowed ? (
                    <Check className="size-4 text-[color:var(--famli-brand)]" />
                  ) : (
                    <Minus className="size-4 text-[color:var(--famli-muted)]" />
                  )}
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </PreviewCard>
      </div>
    </MarketingSection>
  );
}
