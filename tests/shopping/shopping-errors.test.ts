import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ShoppingNotActivatedError,
  SHOPPING_NOT_ACTIVATED_MESSAGE,
  isMissingShoppingTablesError,
  throwIfMissingShoppingTables,
} from "@/lib/shopping/errors";

describe("shopping errors — missing tables", () => {
  it("detects PGRST205 schema cache errors", () => {
    assert.equal(
      isMissingShoppingTablesError({
        code: "PGRST205",
        message: "Could not find the table 'public.shopping_lists' in the schema cache",
      }),
      true,
    );
  });

  it("detects PostgreSQL relation missing errors", () => {
    assert.equal(
      isMissingShoppingTablesError({
        code: "42P01",
        message: 'relation "public.shopping_items" does not exist',
      }),
      true,
    );
  });

  it("ignores unrelated database errors", () => {
    assert.equal(
      isMissingShoppingTablesError({
        code: "23505",
        message: "duplicate key value violates unique constraint",
      }),
      false,
    );
  });

  it("throws ShoppingNotActivatedError for missing tables", () => {
    assert.throws(
      () =>
        throwIfMissingShoppingTables({
          code: "PGRST205",
          message: "Could not find the table 'public.shopping_lists' in the schema cache",
        }),
      (error: unknown) =>
        error instanceof ShoppingNotActivatedError &&
        error.message === SHOPPING_NOT_ACTIVATED_MESSAGE,
    );
  });
});
