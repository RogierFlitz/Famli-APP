"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { requireAuthorizedMutation, assertResourceInFamily } from "@/lib/security/guard";
import { trackProductEvent } from "@/lib/analytics/product";

export async function assignEventTransportAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const role = String(formData.get("role") ?? "dropoff") === "pickup" ? "pickup" : "dropoff";
  const memberId = String(formData.get("memberId") ?? "") || null;
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_calendar",
    rateLimit: "mutation",
  });
  const event = snapshot.events.find((item) => item.id === eventId);
  if (!event) throw new Error("Afspraak niet gevonden.");
  assertResourceInFamily(snapshot, event.familyId);
  await getRepository().updateEventTransport({
    eventId,
    actorUserId: snapshot.currentProfile.id,
    role,
    memberId,
  });
  trackProductEvent("smart_signal_resolved");
  revalidatePath("/vandaag");
  revalidatePath("/agenda");
  revalidatePath("/kinderen");
}
