"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { inferPackingContext } from "@/lib/packing/templates";
import {
  AuthorizationError,
  assertChildInFamily,
  assertResourceInFamily,
  requireAuthorizedMutation,
} from "@/lib/security/guard";
import { hasChildCapability } from "@/lib/security/capabilities";
import { trackProductEvent } from "@/lib/analytics/product";
import type { PackingContext } from "@/lib/domain/types";

function refreshPacking() {
  revalidatePath("/vandaag");
  revalidatePath("/kinderen");
  revalidatePath("/agenda");
  revalidatePath("/regelen");
}

export async function createPackingItemAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    childId,
    rateLimit: "mutation",
  });
  assertChildInFamily(snapshot, childId);
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Geef een item op.");
  const eventId = String(formData.get("eventId") ?? "") || null;
  const handoverId = String(formData.get("handoverId") ?? "") || null;
  const dueOn = String(formData.get("dueOn") ?? "") || null;
  const contextRaw = String(formData.get("context") ?? "") as PackingContext;
  const context =
    contextRaw ||
    inferPackingContext(label, handoverId ? "overdracht" : eventId ? "activiteit" : "overig");
  const checked = String(formData.get("checked") ?? "") === "true";
  await getRepository().createPackingItem({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    childId,
    label,
    context,
    eventId,
    handoverId,
    dueOn,
    checked,
  });
  refreshPacking();
}

export async function togglePackingItemAction(itemId: string) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  const item = snapshot.packingItems.find((row) => row.id === itemId);
  if (!item) throw new Error("Item niet gevonden.");
  assertResourceInFamily(snapshot, item.familyId);
  if (!hasChildCapability(snapshot, item.childId, "edit_tasks")) {
    throw new AuthorizationError();
  }
  const updated = await getRepository().togglePackingItem(itemId, snapshot.currentProfile.id);
  if (updated.checked) {
    trackProductEvent("packing_item_checked");
  }
  refreshPacking();
}

export async function markHandoverReadyAction(formData: FormData) {
  const handoverId = String(formData.get("handoverId") ?? "");
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  const handover = snapshot.handovers.find((item) => item.id === handoverId);
  if (!handover) throw new Error("Overdracht niet gevonden.");
  assertResourceInFamily(snapshot, handover.familyId);
  await getRepository().markHandoverReady({
    handoverId,
    actorUserId: snapshot.currentProfile.id,
  });
  refreshPacking();
}
