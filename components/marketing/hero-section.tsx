import Link from "next/link";

import { HeroAppPreview } from "@/components/marketing/hero-app-preview";

export function HeroSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-12 pt-6 sm:pb-16 sm:pt-10 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:pb-20 lg:pt-12">
      <div>
        <p className="mb-4 text-sm text-[color:var(--famli-muted)]">
          Voor ieder gezin — ook als jullie over meerdere huishoudens verdeeld zijn.
        </p>
        <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-[color:var(--famli-ink)] sm:text-5xl lg:text-6xl">
          Alles wat je gezin moet onthouden. Op één plek.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-[color:var(--famli-muted)] sm:text-lg">
          Agenda&apos;s, boodschappen, taken, school, sport en afspraken. Famli houdt het overzicht,
          zodat jij niet alles hoeft te onthouden.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/signup" className="famli-btn famli-btn-primary min-h-11 w-full sm:w-auto">
            Start met je gezin
          </Link>
          <Link href="/login" className="famli-btn famli-btn-secondary min-h-11 w-full sm:w-auto">
            Inloggen
          </Link>
        </div>
        <p className="mt-4 text-sm text-[color:var(--famli-muted)]">Binnen 2 minuten ingesteld</p>
      </div>
      <HeroAppPreview />
    </section>
  );
}
