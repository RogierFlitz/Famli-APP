import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyAdminStats, loadAdminDirectory } from "@/lib/admin/directory";
import { validateAdminNewUser, validateAdminUserPassword, createAdminManagedUser } from "@/lib/admin/user-admin";
import { resetAdminMemoryForTests } from "@/lib/admin/memory";

describe("admin user password rules", () => {
  it("requires eight characters and a matching confirmation", () => {
    assert.equal(validateAdminUserPassword("short", "short"), "Gebruik minstens 8 tekens.");
    assert.equal(validateAdminUserPassword("langgenoeg", "andersss"), "De wachtwoorden komen niet overeen.");
    assert.equal(validateAdminUserPassword("langgenoeg", "langgenoeg"), null);
  });

  it("requires a name and e-mail for a new user", () => {
    assert.equal(
      validateAdminNewUser({ firstName: "", email: "a@b.nl", password: "langgenoeg", confirm: "langgenoeg" }),
      "Vul voornaam en e-mailadres in.",
    );
    assert.equal(
      validateAdminNewUser({ firstName: "Rogier", email: "nietgeldig", password: "langgenoeg", confirm: "langgenoeg" }),
      "Ongeldig e-mailadres.",
    );
  });
});

describe("admin dashboard stats", () => {
  it("includes chart series for the last seven days", async () => {
    const { stats } = await loadAdminDirectory();
    assert.equal(stats.registrationsLast7Days.length, 7);
    assert.equal(stats.registrationDayLabels.length, 7);
    assert.equal(stats.onboardedCount + stats.openOnboardingCount, stats.userCount);
    assert.equal(stats.withFamilyCount + stats.noFamilyCount, stats.userCount);
  });

  it("empty stats keep the chart arrays", () => {
    const stats = emptyAdminStats();
    assert.equal(stats.registrationsLast7Days.length, 7);
    assert.equal(stats.registrationDayLabels.length, 7);
  });
});

describe("demo admin create user", () => {
  it("creates a local directory user when Supabase is off", async () => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    resetAdminMemoryForTests();
    const result = await createAdminManagedUser(
      { userId: "admin", email: "super@famli.internal", name: "Isa", role: "super_admin" },
      { firstName: "Test", lastName: "Persoon", email: "test.persoon@famli.test", password: "langgenoeg" },
    );
    assert.equal("userId" in result, true);
  });
});
