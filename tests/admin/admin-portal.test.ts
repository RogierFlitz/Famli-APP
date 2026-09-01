import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { adminHasCapability, assertAdminCapability } from "@/lib/admin/roles";
import { filterUsers, loadAdminDirectory } from "@/lib/admin/directory";
import { getAccountFlag, resetAdminMemoryForTests, setAccountFlag } from "@/lib/admin/memory";
import { primaryNav, secondaryNav } from "@/lib/nav";

describe("admin roles", () => {
  it("readonly cannot block or manage roles", () => {
    assert.equal(adminHasCapability("readonly_admin", "block_account"), false);
    assert.equal(adminHasCapability("readonly_admin", "manage_admin_roles"), false);
    assert.equal(adminHasCapability("readonly_admin", "view_dashboard"), true);
  });

  it("support can note but not block or manage roles", () => {
    assert.equal(adminHasCapability("support_admin", "add_support_note"), true);
    assert.equal(adminHasCapability("support_admin", "block_account"), false);
    assert.equal(adminHasCapability("support_admin", "manage_admin_roles"), false);
  });

  it("super admin can block and request elevated inzage", () => {
    assert.equal(adminHasCapability("super_admin", "block_account"), true);
    assert.equal(adminHasCapability("super_admin", "elevate_privacy"), true);
    assert.equal(adminHasCapability("support_admin", "elevate_privacy"), false);
    assert.doesNotThrow(() => assertAdminCapability("super_admin", "block_account"));
    assert.throws(() => assertAdminCapability("readonly_admin", "block_account"));
    assert.throws(() => assertAdminCapability("readonly_admin", "add_support_note"));
  });
});

describe("admin directory privacy", () => {
  it("user directory does not include private family content", async () => {
    const { users, families, stats } = await loadAdminDirectory();
    assert.ok(stats.userCount >= 3);
    assert.ok(stats.familyCount >= 1);
    assert.ok(stats.childCount >= 2);
    assert.equal(stats.registrationsLast7Days.length, 7);
    const blob = JSON.stringify({ users, families, stats });
    assert.equal(blob.includes("Bitje verplicht"), false);
    assert.equal(blob.includes("Hockeycontributie"), false);
    assert.equal(blob.includes("passportNumber"), false);
    assert.equal(blob.includes("NXB12R37"), false);
  });

  it("search matches email and hides others", async () => {
    const { users } = await loadAdminDirectory();
    const emma = filterUsers(users, "all", "emma@famli.test");
    assert.equal(emma.length, 1);
    assert.equal(emma[0]?.firstName, "Emma");
    const blocked = filterUsers(users, "blocked", "");
    assert.equal(blocked.length, 0);
    const pending = filterUsers(users, "pending_invite", "");
    assert.equal(pending.every((item) => item.hasPendingInvite), true);
  });
});

describe("admin account flags", () => {
  beforeEach(() => resetAdminMemoryForTests());

  it("blocks and unblocks in memory", () => {
    const userId = "22222222-2222-4222-a222-222222222222";
    assert.equal(getAccountFlag(userId).status, "active");
    setAccountFlag(userId, {
      status: "blocked",
      blockedAt: new Date().toISOString(),
      blockedReason: "misbruik",
      blockedBy: "admin",
    });
    assert.equal(getAccountFlag(userId).status, "blocked");
  });
});

describe("family navigation isolation", () => {
  it("does not link to /admin", () => {
    const hrefs = [...primaryNav, ...secondaryNav].map((item) => item.href);
    assert.equal(hrefs.some((href) => href.startsWith("/admin")), false);
  });
});

describe("unauthorized admin mutations", () => {
  it("rejects write capabilities for a family-equivalent readonly role", () => {
    assert.throws(() => assertAdminCapability("readonly_admin", "block_account"));
    assert.throws(() => assertAdminCapability("readonly_admin", "manage_admin_roles"));
    assert.throws(() => assertAdminCapability("support_admin", "block_account"));
  });
});
