import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMissingRelationError } from "@/lib/admin/schema-errors";

describe("admin schema errors", () => {
  it("detects a missing admin_staff table", () => {
    assert.equal(isMissingRelationError({ code: "42P01", message: 'relation "public.admin_staff" does not exist' }), true);
    assert.equal(isMissingRelationError({ code: "PGRST205", message: "Could not find the table 'public.admin_staff' in the schema cache" }), true);
    assert.equal(isMissingRelationError({ message: "invalid login credentials" }), false);
  });
});
