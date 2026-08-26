import { randomUUID } from "crypto";
import type { ShoppingCategory, ShoppingItem, ShoppingList } from "@/lib/domain/types";

export const DEFAULT_SHOPPING_LIST_NAME = "Boodschappen";

export function mapShoppingListRow(row: Record<string, unknown>): ShoppingList {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    name: row.name as string,
    isDefault: Boolean(row.is_default),
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapShoppingItemRow(row: Record<string, unknown>): ShoppingItem {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    listId: row.list_id as string,
    name: row.name as string,
    quantity: row.quantity == null ? null : Number(row.quantity),
    unit: (row.unit as string | null) ?? null,
    category: row.category as ShoppingCategory,
    note: (row.note as string | null) ?? null,
    completed: Boolean(row.completed),
    completedBy: (row.completed_by as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function buildDefaultShoppingList(input: {
  familyId: string;
  createdBy: string;
  id?: string;
  createdAt?: string;
}): ShoppingList {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: input.id ?? randomUUID(),
    familyId: input.familyId,
    name: DEFAULT_SHOPPING_LIST_NAME,
    isDefault: true,
    createdBy: input.createdBy,
    createdAt,
    updatedAt: createdAt,
  };
}

export function sortShoppingItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function sortShoppingLists(lists: ShoppingList[]): ShoppingList[] {
  return [...lists].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name, "nl");
  });
}
