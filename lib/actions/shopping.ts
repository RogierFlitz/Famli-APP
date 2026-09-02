"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { requireAuthorizedMutation, assertResourceInFamily } from "@/lib/security/guard";
import type { ShoppingCategory } from "@/lib/domain/types";

function refreshShopping() {
  revalidatePath("/boodschappen");
  revalidatePath("/vandaag");
}

export async function addShoppingItemAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  const listId = String(formData.get("listId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Geef een naam op.");
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const quantity = quantityRaw ? Number(quantityRaw) : null;
  await getRepository().addShoppingItem({
    familyId: snapshot.family.id,
    listId,
    name,
    quantity: Number.isFinite(quantity) ? quantity : null,
    unit: String(formData.get("unit") ?? "") || null,
    category: (String(formData.get("category") ?? "") || undefined) as ShoppingCategory | undefined,
    note: String(formData.get("note") ?? "") || null,
    createdBy: snapshot.currentProfile.id,
  });
  refreshShopping();
}

export async function updateShoppingItemAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  const id = String(formData.get("id") ?? "");
  const item = snapshot.shoppingItems.find((row) => row.id === id);
  if (item) assertResourceInFamily(snapshot, item.familyId);
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const quantity = quantityRaw ? Number(quantityRaw) : null;
  await getRepository().updateShoppingItem({
    id,
    actorUserId: snapshot.currentProfile.id,
    name: String(formData.get("name") ?? "") || undefined,
    quantity: quantityRaw ? (Number.isFinite(quantity) ? quantity : null) : undefined,
    unit: formData.has("unit") ? String(formData.get("unit") ?? "") || null : undefined,
    category: (String(formData.get("category") ?? "") || undefined) as ShoppingCategory | undefined,
    note: formData.has("note") ? String(formData.get("note") ?? "") || null : undefined,
  });
  refreshShopping();
}

export async function toggleShoppingItemAction(itemId: string) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  const item = snapshot.shoppingItems.find((row) => row.id === itemId);
  if (item) assertResourceInFamily(snapshot, item.familyId);
  await getRepository().toggleShoppingItem(
    itemId,
    snapshot.currentProfile.id,
    snapshot.currentMember.id,
  );
  refreshShopping();
}

export async function deleteShoppingItemAction(itemId: string) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  const item = snapshot.shoppingItems.find((row) => row.id === itemId);
  if (item) assertResourceInFamily(snapshot, item.familyId);
  await getRepository().deleteShoppingItem(itemId, snapshot.currentProfile.id);
  refreshShopping();
}

export async function clearCompletedShoppingItemsAction(listId: string) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  await getRepository().clearCompletedShoppingItems(listId, snapshot.currentProfile.id);
  refreshShopping();
}

export async function createShoppingListAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Geef een naam op.");
  await getRepository().createShoppingList({
    familyId: snapshot.family.id,
    name,
    createdBy: snapshot.currentProfile.id,
  });
  refreshShopping();
}

export async function renameShoppingListAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  const listId = String(formData.get("listId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const list = snapshot.shoppingLists.find((row) => row.id === listId);
  if (list) assertResourceInFamily(snapshot, list.familyId);
  await getRepository().renameShoppingList(listId, name, snapshot.currentProfile.id);
  refreshShopping();
}

export async function deleteShoppingListAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  const listId = String(formData.get("listId") ?? "");
  const list = snapshot.shoppingLists.find((row) => row.id === listId);
  if (list) assertResourceInFamily(snapshot, list.familyId);
  await getRepository().deleteShoppingList(listId, snapshot.currentProfile.id);
  refreshShopping();
}
