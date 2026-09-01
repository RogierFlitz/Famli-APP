import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { passwordResetRedirectTo } from "@/lib/auth/password-reset";
import { safeRedirectPath } from "@/lib/security/redirect";

describe("password reset urls", () => {
  it("points recovery mail at the auth callback", () => {
    assert.equal(
      passwordResetRedirectTo("https://famli-app.vercel.app"),
      "https://famli-app.vercel.app/auth/callback?next=/login/nieuw-wachtwoord",
    );
  });

  it("strips a trailing slash from the site URL", () => {
    assert.equal(
      passwordResetRedirectTo("https://famli-app.vercel.app/"),
      "https://famli-app.vercel.app/auth/callback?next=/login/nieuw-wachtwoord",
    );
  });

  it("allows the new-password page as a redirect", () => {
    assert.equal(safeRedirectPath("/login/nieuw-wachtwoord"), "/login/nieuw-wachtwoord");
  });

  it("rejects an open redirect on the auth callback next param", () => {
    assert.equal(safeRedirectPath("https://evil.test", "/login/nieuw-wachtwoord"), "/login/nieuw-wachtwoord");
    assert.equal(safeRedirectPath("//evil.test", "/login/nieuw-wachtwoord"), "/login/nieuw-wachtwoord");
  });
});
