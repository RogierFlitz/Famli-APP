import Link from "next/link";
import { FamliLogo } from "@/components/brand/logo";
import { FamliWash } from "@/components/brand/wash";
import { getSession } from "@/lib/auth/session";
import { ProductMockups } from "@/components/landing/product-mockups";
import { famliBrand } from "@/lib/brand/tokens";

export default async function LandingPage() {
  const session = await getSession();

  return (
    <FamliWash>
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <FamliLogo />
        <div className="flex items-center gap-3">
          {session ? (
            <Link href="/vandaag" className="famli-btn famli-btn-primary h-10 px-4">
              Naar Vandaag
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-[color:var(--famli-muted)] sm:block">
                Inloggen
              </Link>
              <Link href="/signup" className="famli-btn famli-btn-primary h-10 px-4">
                Gratis beginnen
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:pt-16">
        <div>
          <p className="mb-4 text-sm text-[color:var(--famli-muted)]">{famliBrand.sloganEn}</p>
          <h1 className="max-w-xl text-5xl leading-[1.05] font-semibold tracking-tight text-[color:var(--famli-ink)] sm:text-6xl">
            {famliBrand.sloganNl}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[color:var(--famli-muted)]">
            Agenda’s, wisseldagen, afspraken en kosten op één rustige plek — voor beide ouders.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="famli-btn famli-btn-primary">
              Gratis beginnen
            </Link>
            <a href="#hoe-het-werkt" className="famli-btn famli-btn-secondary">
              Bekijk hoe het werkt
            </a>
          </div>
        </div>
        <ProductMockups />
      </section>

      <section id="hoe-het-werkt" className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Eén agenda",
              text: "Zie in één oogopslag waar de kinderen zijn, wat er speelt en wie haalt of brengt.",
            },
            {
              title: "Wijzigingen zonder gedoe",
              text: "Stel een ruil voor, kies een alternatief en bewaar de historie automatisch.",
            },
            {
              title: "Kosten die kloppen",
              text: "Niet alleen losse bonnetjes, maar een helder saldo: jij krijgt, of jij betaalt.",
            },
          ].map((item) => (
            <div key={item.title} className="famli-card">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--famli-muted)]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
    </FamliWash>
  );
}
