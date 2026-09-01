import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { skipSupabaseAuthRefresh } from "../../proxy";

describe("skipSupabaseAuthRefresh", () => {
  it("skips the login and ping routes so they cannot hang on getUser", () => {
    assert.equal(skipSupabaseAuthRefresh("/admin"), true);
    assert.equal(skipSupabaseAuthRefresh("/admin/ok"), true);
    assert.equal(skipSupabaseAuthRefresh("/admin/login"), true);
  });

  it("still refreshes the session on the rest of beheer", () => {
    assert.equal(skipSupabaseAuthRefresh("/admin/dashboard"), false);
    assert.equal(skipSupabaseAuthRefresh("/admin/gezinnen"), false);
    assert.equal(skipSupabaseAuthRefresh("/vandaag"), false);
  });
});
