import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  bootstrapSecretMatches,
  isAdminBootstrapEnabled,
  readBootstrapSession,
  signBootstrapSession,
} from "@/lib/admin/bootstrap";

describe("admin bootstrap secret", () => {
  const previous = process.env.ADMIN_BOOTSTRAP_SECRET;

  beforeEach(() => {
    process.env.ADMIN_BOOTSTRAP_SECRET = "tijdelijke-famli-code-32";
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.ADMIN_BOOTSTRAP_SECRET;
    else process.env.ADMIN_BOOTSTRAP_SECRET = previous;
  });

  it("is disabled when the secret is missing or too short", () => {
    process.env.ADMIN_BOOTSTRAP_SECRET = "kort";
    assert.equal(isAdminBootstrapEnabled(), false);
    assert.equal(bootstrapSecretMatches("kort"), false);
  });

  it("accepts only the matching secret and signs a session", () => {
    assert.equal(isAdminBootstrapEnabled(), true);
    assert.equal(bootstrapSecretMatches("tijdelijke-famli-code-32"), true);
    assert.equal(bootstrapSecretMatches("iets-anders-dat-niet-klopt"), false);
    const token = signBootstrapSession();
    const actor = readBootstrapSession(token);
    assert.equal(actor?.role, "super_admin");
    assert.equal(readBootstrapSession("niet.geldig"), null);
  });
});
