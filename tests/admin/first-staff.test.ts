import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldClaimFirstSuperAdmin } from "@/lib/admin/first-staff";

describe("first super-admin claim", () => {
  it("claims only when no staff exists yet", () => {
    assert.equal(shouldClaimFirstSuperAdmin(0), true);
    assert.equal(shouldClaimFirstSuperAdmin(1), false);
    assert.equal(shouldClaimFirstSuperAdmin(4), false);
  });
});
