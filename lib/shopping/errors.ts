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
  if (
    /shopping_(lists|items)/i.test(text) &&
    /(schema cache|does not exist|not find|niet gevonden|unknown table|no such table)/i.test(text)
  ) {
    return true;
  }
  return false;
}

export function isShoppingNotActivatedError(error: unknown): boolean {
  if (error instanceof ShoppingNotActivatedError) return true;
  if (error instanceof Error && error.name === "ShoppingNotActivatedError") return true;
  return isMissingShoppingTablesError(error);
}

export function throwIfMissingShoppingTables(error: unknown): never {
  if (isMissingShoppingTablesError(error)) {
    throw new ShoppingNotActivatedError();
  }
  throw error;
}

export const SHOPPING_LOAD_ERROR_MESSAGE =
  "De boodschappenlijst kon niet worden geladen. Vernieuw de pagina of probeer het later opnieuw.";
