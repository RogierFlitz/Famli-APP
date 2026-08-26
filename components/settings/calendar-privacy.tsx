"use client";

import { toast } from "sonner";
import { updateCalendarPrivacyAction } from "@/lib/actions/family";
import { calendarProviders } from "@/lib/calendar/providers";
import type { CalendarPrivacyMode } from "@/lib/domain/types";

const privacyOptions: Array<[CalendarPrivacyMode, string]> = [
  ["full", "Volledige afspraak"],
  ["busy", 'Alleen "Bezet"'],
  ["hidden", "Helemaal niet delen"],
];

export function CalendarPrivacyPanel({ privacyMode }: { privacyMode: CalendarPrivacyMode }) {
  return (
    <>
      <form
        className="mt-4 space-y-3"
        action={async (formData) => {
          try {
            await updateCalendarPrivacyAction(formData);
            toast.success("Privacy-instelling opgeslagen");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Opslaan mislukt");
          }
        }}
      >
        <p className="text-sm font-medium">Persoonlijke afspraken tonen als</p>
        {privacyOptions.map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input type="radio" name="privacyMode" value={value} defaultChecked={privacyMode === value} />
            {label}
          </label>
        ))}
        <button className="h-11 rounded-full border border-[color:var(--nest-border)] px-4">Opslaan</button>
      </form>
      <div className="mt-6 space-y-3">
        <p className="text-sm text-[color:var(--nest-muted)]">
          Agenda-koppeling komt binnenkort beschikbaar. Je kunt nu al je privacyvoorkeur instellen.
        </p>
        {calendarProviders.map((provider) => (
          <div key={provider.id} className="rounded-2xl bg-[color:var(--nest-bg)] p-4">
            <p className="font-medium">{provider.label}</p>
            <p className="text-sm text-[color:var(--nest-muted)]">{provider.description}</p>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="mt-2 h-10 cursor-not-allowed rounded-full border border-dashed border-[color:var(--nest-border)] px-4 text-sm text-[color:var(--nest-muted)]"
            >
              Binnenkort beschikbaar
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
