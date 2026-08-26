export const SHOPPING_NOT_ACTIVATED_MESSAGE =
  "Boodschappenlijst is nog niet geactiveerd. Vraag de beheerder om migratie 0009 uit te voeren.";

export class ShoppingNotActivatedError extends Error {
  constructor(message = SHOPPING_NOT_ACTIVATED_MESSAGE) {
    super(message);
    this.name = "ShoppingNotActivatedError";
  }
}

function shoppingErrorText(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const record = error as { message?: unknown; code?: unknown; details?: unknown };
    return [record.message, record.code, record.details]
      .filter((value) => typeof value === "string")
      .join(" ");
  }
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

export function isMissingShoppingTablesError(error: unknown): boolean {
  const text = shoppingErrorText(error);
  if (/PGRST205/i.test(text)) return true;
  if (/42P01/i.test(text)) return true;
  if (/Could not find the table .*(shopping_lists|shopping_items)/i.test(text)) return true;
  if (/relation .*(shopping_lists|shopping_items).* does not exist/i.test(text)) return true;
  return false;
}

export function throwIfMissingShoppingTables(error: unknown): never {
  if (isMissingShoppingTablesError(error)) {
    throw new ShoppingNotActivatedError();
  }
  throw error;
}
