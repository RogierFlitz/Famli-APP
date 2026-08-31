"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorizedMutation } from "@/lib/security/guard";
import { getRepository } from "@/lib/data";
import type { CalendarProvider } from "@/lib/domain/types";
import { calendarFeedUrls, type IssuedCalendarFeed } from "@/lib/calendar/ics-export";
import { calendarFeedActionError } from "@/lib/calendar/feed-errors";

export async function syncCalendarAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });
  const provider = String(formData.get("provider") ?? "") as CalendarProvider;
  await getRepository().syncCalendarConnection(snapshot.currentProfile.id, provider);
  revalidatePath("/instellingen");
  revalidatePath("/agenda");
}

export async function disconnectCalendarAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });
  const provider = String(formData.get("provider") ?? "") as CalendarProvider;
  await getRepository().disconnectCalendar(snapshot.currentProfile.id, provider);
  revalidatePath("/instellingen");
  revalidatePath("/agenda");
}

export async function connectIcsCalendarAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });
  const icsUrl = String(formData.get("icsUrl") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || undefined;
  if (!icsUrl.startsWith("http://") && !icsUrl.startsWith("https://")) {
    throw new Error("Voer een geldige ICS-URL in (https://…).");
  }
  await getRepository().connectIcsCalendar(snapshot.currentProfile.id, snapshot.family.id, icsUrl, label);
  revalidatePath("/instellingen");
  revalidatePath("/agenda");
}

export async function updateGoogleCalendarsAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });
  const selected = formData.getAll("calendarId").map(String);
  await getRepository().updateGoogleSelectedCalendars(snapshot.currentProfile.id, selected);
  revalidatePath("/instellingen");
  revalidatePath("/agenda");
}

export async function syncStaleCalendarsAction() {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });
  await getRepository().syncStaleCalendars(snapshot.currentProfile.id);
  revalidatePath("/agenda");
}

export async function issueCalendarFeedAction(): Promise<IssuedCalendarFeed | { error: string }> {
  try {
    const { snapshot } = await requireAuthorizedMutation({
      capability: "view_calendar",
      rateLimit: "mutation",
    });
    const { token } = await getRepository().issueCalendarFeedToken(
      snapshot.currentProfile.id,
      snapshot.family.id,
    );
    revalidatePath("/instellingen");
    return calendarFeedUrls(token, snapshot.family.name);
  } catch (error) {
    return { error: calendarFeedActionError(error, "Link maken mislukt") };
  }
}

export async function revokeCalendarFeedAction(): Promise<{ error?: string }> {
  try {
    const { snapshot } = await requireAuthorizedMutation({
      capability: "view_calendar",
      rateLimit: "mutation",
    });
    await getRepository().revokeCalendarFeedToken(snapshot.currentProfile.id);
    revalidatePath("/instellingen");
    return {};
  } catch (error) {
    return { error: calendarFeedActionError(error, "Uitschakelen mislukt") };
  }
}
