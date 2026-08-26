"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { requireAuthorizedMutation } from "@/lib/security/guard";

async function revalidateNotificationPaths() {
  revalidatePath("/vandaag");
  revalidatePath("/regelen");
  revalidatePath("/agenda");
  revalidatePath("/kosten");
  revalidatePath("/kinderen");
  revalidatePath("/documenten");
  revalidatePath("/instellingen");
}

export async function markNotificationReadAction(notificationId: string) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });
  await getRepository().markNotificationRead(notificationId, snapshot.currentProfile.id);
  await revalidateNotificationPaths();
}

export async function markAllNotificationsReadAction() {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });
  await getRepository().markAllNotificationsRead(snapshot.currentProfile.id);
  await revalidateNotificationPaths();
}

export async function deleteNotificationAction(notificationId: string) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_calendar",
    rateLimit: "mutation",
  });
  await getRepository().deleteNotification(notificationId, snapshot.currentProfile.id);
  await revalidateNotificationPaths();
}
