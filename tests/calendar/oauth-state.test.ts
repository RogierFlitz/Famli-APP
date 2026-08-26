import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPkcePair, validateOAuthState, type OAuthStatePayload } from "@/lib/calendar/oauth-state";

describe("calendar oauth state validation", () => {
  it("creates verifiable PKCE pair", () => {
    const { codeVerifier, codeChallenge } = createPkcePair();
    assert.ok(codeVerifier.length > 20);
    assert.ok(codeChallenge.length > 20);
    assert.notEqual(codeVerifier, codeChallenge);
  });

  it("accepts matching fresh state", () => {
    const payload: OAuthStatePayload = {
      state: "abc",
      codeVerifier: "verifier",
      userId: "user-1",
      familyId: "family-1",
      provider: "google",
      createdAt: Date.now(),
    };
    assert.equal(validateOAuthState(payload, "abc"), true);
  });

  it("rejects mismatched state", () => {
    const payload: OAuthStatePayload = {
      state: "abc",
      codeVerifier: "verifier",
      userId: "user-1",
      familyId: "family-1",
      provider: "google",
      createdAt: Date.now(),
    };
    assert.equal(validateOAuthState(payload, "wrong"), false);
  });

  it("rejects expired state", () => {
    const payload: OAuthStatePayload = {
      state: "abc",
      codeVerifier: "verifier",
      userId: "user-1",
      familyId: "family-1",
      provider: "google",
      createdAt: Date.now() - 20 * 60 * 1000,
    };
    assert.equal(validateOAuthState(payload, "abc"), false);
  });
});
