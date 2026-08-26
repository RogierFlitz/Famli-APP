import {
  MarketingSection,
  PreviewCard,
  SectionHeading,
} from "@/components/marketing/marketing-primitives";

const days = [
  { label: "Ma", parent: "mama" },
  { label: "Di", parent: "mama" },
  { label: "Wo", parent: "papa" },
  { label: "Do", parent: "papa" },
  { label: "Vr", parent: "papa" },
  { label: "Za", parent: "mama" },
  { label: "Zo", parent: "mama" },
];

export function CoParentingSection() {
  return (
    <MarketingSection id="co-ouderschap">
      <SectionHeading
        title="Ook als thuis twee adressen heeft."
        subtitle="Minder losse berichtjes. Meer duidelijkheid voor iedereen."
      />
      <PreviewCard className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-semibold">Weekoverzicht</p>
          <div className="flex gap-3 text-xs text-[color:var(--famli-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[color:var(--famli-parent-1)]" />
              Mama
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[color:var(--famli-parent-2)]" />
              Papa
            </span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <div key={day.label} className="text-center">
              <p className="mb-2 text-xs font-medium text-[color:var(--famli-muted)]">{day.label}</p>
              <div
                className={`rounded-xl px-1 py-4 text-xs font-medium ${
                  day.parent === "mama"
                    ? "bg-[color:var(--famli-parent-1)]/35 text-[color:var(--famli-ink)]"
                    : "bg-[color:var(--famli-parent-2)]/35 text-[color:var(--famli-ink)]"
                }`}
              >
                {day.parent === "mama" ? "Mama" : "Papa"}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4 text-sm">
            <p className="font-medium">Woensdag — overdracht</p>
            <p className="mt-1 text-[color:var(--famli-muted)]">
              Mila & Noah naar papa · hockeystick, bidon, huiswerk
            </p>
          </div>
          <div className="rounded-2xl bg-[color:var(--famli-bg)] p-4 text-sm">
            <p className="font-medium">Vrijdag — ophalen</p>
            <p className="mt-1 text-[color:var(--famli-muted)]">
              Papa haalt Mila op · zwemtas mee
            </p>
          </div>
        </div>
      </PreviewCard>
    </MarketingSection>
  );
}
