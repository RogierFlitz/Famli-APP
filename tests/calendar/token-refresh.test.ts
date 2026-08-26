import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

describe("calendar token refresh logic", () => {
  it("refreshes google token when expired (mocked fetch)", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () =>
      Response.json({
        access_token: "new-access",
        expires_in: 3600,
        refresh_token: "new-refresh",
      }),
    ) as typeof fetch;

    try {
      const { refreshGoogleToken } = await import("@/lib/calendar/providers/google");
      process.env.GOOGLE_CLIENT_ID = "test-client";
      process.env.GOOGLE_CLIENT_SECRET = "test-secret";
      const result = await refreshGoogleToken("old-refresh");
      assert.equal(result.accessToken, "new-access");
      assert.equal(result.refreshToken, "new-refresh");
      assert.ok(result.expiresAt);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
    }
  });

  it("refreshes microsoft token when expired (mocked fetch)", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () =>
      Response.json({
        access_token: "ms-access",
        expires_in: 3600,
      }),
    ) as typeof fetch;

    try {
      const { refreshMicrosoftToken } = await import("@/lib/calendar/providers/microsoft");
      process.env.MICROSOFT_CLIENT_ID = "test-client";
      process.env.MICROSOFT_CLIENT_SECRET = "test-secret";
      const result = await refreshMicrosoftToken("old-refresh");
      assert.equal(result.accessToken, "ms-access");
      assert.ok(result.expiresAt);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.MICROSOFT_CLIENT_ID;
      delete process.env.MICROSOFT_CLIENT_SECRET;
    }
  });
});
