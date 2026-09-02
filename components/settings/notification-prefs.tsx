"use client";

import { toast } from "sonner";
import { notificationPrefLabel } from "@/lib/domain/labels";
import { mergeNotificationPrefs, NOTIFICATION_CHANNEL_KEYS } from "@/lib/notifications/prefs";
import { updateNotificationPrefsAction } from "@/lib/actions/family-hub";
import type { FamilySnapshot } from "@/lib/domain/types";

export function NotificationPrefsForm({ snapshot }: { snapshot: FamilySnapshot }) {
  const prefs = mergeNotificationPrefs(snapshot.currentProfile.notificationPrefs);
  return (
    <form
      className="mt-4 space-y-4"
      action={async (formData) => {
        try {
          await updateNotificationPrefsAction(formData);
          toast.success("Meldingen opgeslagen");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Opslaan mislukt");
        }
      }}
    >
      <p className="text-sm text-[color:var(--famli-muted)]">
        Kies per onderwerp of je een melding in de app en/of per e-mail wilt. Push volgt later.
      </p>
      <div className="space-y-3">
        {NOTIFICATION_CHANNEL_KEYS.map((key) => (
          <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[color:var(--famli-bg)] px-4 py-3">
            <p className="text-sm font-medium">{notificationPrefLabel(key)}</p>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name={`${key}_inApp`} defaultChecked={prefs[key].inApp} />
                In de app
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name={`${key}_email`} defaultChecked={prefs[key].email} />
                E-mail
              </label>
            </div>
          </div>
        ))}
      </div>
      <button className="famli-btn famli-btn-primary h-11 px-4">Opslaan</button>
    </form>
  );
}
