import Link from "next/link";

import { MarketingSection } from "@/components/marketing/marketing-primitives";

export function FinalCtaSection() {
  return (
    <MarketingSection className="pb-24 pt-8">
      <div className="rounded-[2rem] border border-[color:var(--famli-border)] bg-gradient-to-br from-[color:var(--famli-brand-soft)] via-[color:var(--famli-card)] to-[color:var(--famli-coral)]/15 px-6 py-12 text-center shadow-[var(--famli-shadow-lift)] sm:px-10 sm:py-16">
        <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight text-[color:var(--famli-ink)] sm:text-4xl">
          Je hoeft niet alles zelf te onthouden.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-[color:var(--famli-muted)] sm:text-lg">
          Maak je gezin aan en laat Famli helpen met de rest.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="famli-btn famli-btn-primary min-h-11 w-full sm:w-auto">
            Start met je gezin
          </Link>
          <Link href="/login" className="famli-btn famli-btn-secondary min-h-11 w-full sm:w-auto">
            Inloggen
          </Link>
        </div>
        <p className="mt-4 text-sm text-[color:var(--famli-muted)]">Binnen 2 minuten ingesteld</p>
      </div>
    </MarketingSection>
  );
}
