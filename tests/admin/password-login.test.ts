import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminLoginErrorPath, adminPasswordLoginDestination } from "@/lib/admin/password-login";
import { resetRateLimitsForTests } from "@/lib/security/rate-limit";

describe("adminLoginErrorPath", () => {
  it("puts the Dutch message on the login page query string", () => {
    assert.equal(
      adminLoginErrorPath("Inloggen mislukt."),
      "/admin?error=Inloggen%20mislukt.",
    );
  });
});

describe("adminPasswordLoginDestination", () => {
  it("sends an unknown demo e-mail back to /admin with an error", async () => {
    resetRateLimitsForTests();
    const result = await adminPasswordLoginDestination("nobody@example.com", "");
    assert.equal(result.path.startsWith("/admin?error="), true);
    assert.equal(result.demoUserId, undefined);
  });

  it("accepts a demo admin when Supabase is off", async () => {
    resetRateLimitsForTests();
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return;
    }
    const result = await adminPasswordLoginDestination("super@famli.internal", "");
    assert.equal(result.path, "/admin/dashboard");
    assert.ok(result.demoUserId);
  });
});
