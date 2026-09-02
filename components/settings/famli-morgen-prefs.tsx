"use client";

import { toast } from "sonner";
import { mergeNotificationPrefs } from "@/lib/notifications/prefs";
import { updateNotificationPrefsAction } from "@/lib/actions/family-hub";
import type { FamilySnapshot } from "@/lib/domain/types";

export function FamliMorgenPrefsForm({ snapshot }: { snapshot: FamilySnapshot }) {
  const prefs = mergeNotificationPrefs(snapshot.currentProfile.notificationPrefs).famliMorgen;
  return (
    <form
      className="mt-4 space-y-4"
      action={async (formData) => {
        formData.set("famliMorgen", "1");
        try {
          await updateNotificationPrefsAction(formData);
          toast.success("Famli Morgen opgeslagen");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Opslaan mislukt");
        }
      }}
    >
      <p className="text-sm text-[color:var(--famli-muted)]">
        Iedere avond een gebundeld overzicht. E-mail blijft bewust kort: alleen aantallen, geen namen.
        Push volgt later.
      </p>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input type="checkbox" name="famliMorgen_enabled" defaultChecked={prefs.enabled} className="size-5" />
        Dagelijks overzicht ontvangen
      </label>
      <label className="block text-sm font-medium">
        Tijd
        <input
          type="time"
          name="famliMorgen_time"
          defaultValue={prefs.time}
          className="famli-input mt-1 max-w-40"
        />
      </label>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="famliMorgen_inApp" defaultChecked={prefs.inApp} className="size-5" />
          In Famli
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="famliMorgen_email" defaultChecked={prefs.email} className="size-5" />
          E-mail
        </label>
      </div>
      <p className="text-xs text-[color:var(--famli-muted)]">
        E-mail versturen we pas als er een mailprovider is. Je keuze wordt al bewaard.
      </p>
      <button className="famli-btn famli-btn-primary h-11 px-4">Opslaan</button>
    </form>
  );
}
