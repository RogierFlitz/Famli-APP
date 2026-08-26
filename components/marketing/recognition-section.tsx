import { MarketingSection, SectionHeading } from "@/components/marketing/marketing-primitives";

const questions = [
  "Wie haalt haar op?",
  "Moest de gymtas vandaag mee?",
  "Hebben we nog melk?",
  "Wanneer is zwemles?",
  "Wie koopt het cadeau?",
  "Bij wie zijn de kinderen vrijdag?",
];

export function RecognitionSection() {
  return (
    <MarketingSection tinted className="my-4 sm:my-8">
      <SectionHeading centered title="Een gezin heeft al genoeg om aan te denken." />
      <ul className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {questions.map((question) => (
          <li
            key={question}
            className="rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-4 text-center text-sm leading-6 text-[color:var(--famli-ink)] shadow-[var(--famli-shadow-rest)] transition-shadow hover:shadow-[var(--famli-shadow-lift)] sm:text-base"
          >
            {question}
          </li>
        ))}
      </ul>
      <p className="mt-10 text-center text-lg font-medium text-[color:var(--famli-brand)]">
        Famli houdt het voor jullie bij.
      </p>
    </MarketingSection>
  );
}
