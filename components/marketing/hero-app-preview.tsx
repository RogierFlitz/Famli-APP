import { Backpack, FileText, ShoppingBag, Trophy } from "lucide-react";

import { MemberAvatar, PreviewCard } from "@/components/marketing/marketing-primitives";

const schedule = [
  {
    time: "08:30",
    title: "School",
    detail: "Mila · gymtas mee",
    tone: "bg-[color:var(--famli-school)]/25",
    addedBy: "E",
  },
  {
    time: "15:15",
    title: "Papa haalt Mila op",
    detail: "Bij school · hockeystick mee",
    tone: "bg-[color:var(--famli-parent-1)]/30",
    addedBy: "T",
  },
  {
    time: "17:00",
    title: "Hockeytraining",
    detail: "Sportpark Zuid · Roxy",
    tone: "bg-[color:var(--famli-sport)]/30",
    addedBy: "E",
  },
  {
    time: "18:30",
    title: "Pasta eten",
    detail: "Thuis · samen met Noah",
    tone: "bg-[color:var(--famli-yellow)]/20",
    addedBy: "E",
  },
];

const shopping = [
  { label: "Melk", by: "S" },
  { label: "Bananen", by: "E" },
  { label: "Brood", by: "T" },
];

const reminders = [
  { label: "Gymtas mee", icon: Backpack },
  { label: "Hockeystick", icon: Trophy },
  { label: "Schoolformulier", icon: FileText },
];

export function HeroAppPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:mx-0">
      <PreviewCard className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[color:var(--famli-muted)]">Woensdag 26 augustus</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Goedemorgen, Emma
            </p>
          </div>
          <div className="flex -space-x-2">
            <MemberAvatar initial="E" />
            <MemberAvatar initial="T" />
            <MemberAvatar initial="M" />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Vandaag</p>
              <span className="text-xs text-[color:var(--famli-muted)]">4 afspraken</span>
            </div>
            <div className="space-y-2">
              {schedule.map((item) => (
                <div key={`${item.time}-${item.title}`} className={`rounded-2xl p-3 ${item.tone}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-[color:var(--famli-muted)]">{item.time}</p>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-[color:var(--famli-muted)]">{item.detail}</p>
                    </div>
                    <MemberAvatar initial={item.addedBy} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-bg)] p-3">
              <div className="mb-2 flex items-center gap-2">
                <ShoppingBag className="size-4 text-[color:var(--famli-brand)]" />
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--famli-muted)]">
                  Boodschappen
                </p>
              </div>
              <ul className="space-y-2">
                {shopping.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-3.5 rounded border border-[color:var(--famli-border)]" />
                      {item.label}
                    </span>
                    <MemberAvatar initial={item.by} size="sm" />
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[color:var(--famli-border)] bg-[color:var(--famli-bg)] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--famli-muted)]">
                Niet vergeten
              </p>
              <ul className="space-y-2">
                {reminders.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <item.icon className="size-3.5 text-[color:var(--famli-brand)]" />
                      {item.label}
                    </span>
                    <MemberAvatar initial="E" size="sm" />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-[color:var(--famli-brand-soft)] to-[color:var(--famli-coral)]/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--famli-muted)]">
              Gezin
            </p>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-[color:var(--famli-card)]/80 px-3 py-2">
                <span>
                  <span className="font-medium">Mila</span>
                  <span className="text-[color:var(--famli-muted)]"> — vandaag bij papa</span>
                </span>
                <MemberAvatar initial="M" size="sm" />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[color:var(--famli-card)]/80 px-3 py-2">
                <span>
                  <span className="font-medium">Noah</span>
                  <span className="text-[color:var(--famli-muted)]"> — vandaag bij mama</span>
                </span>
                <MemberAvatar initial="N" size="sm" />
              </div>
            </div>
          </div>
        </div>
      </PreviewCard>

      <div
        aria-hidden
        className="absolute -bottom-6 -right-4 hidden h-24 w-24 rounded-full bg-[color:var(--famli-coral)]/25 blur-2xl sm:block"
      />
      <div
        aria-hidden
        className="absolute -left-6 -top-6 hidden h-28 w-28 rounded-full bg-[color:var(--famli-blue)]/20 blur-2xl sm:block"
      />
    </div>
  );
}
