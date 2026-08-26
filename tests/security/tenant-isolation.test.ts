import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { createDemoSnapshot } from "@/lib/data/seed";
import { IDS } from "@/lib/data/ids";
import {
  hasCapability,
  hasChildCapability,
  memberCapabilities,
} from "@/lib/security/capabilities";
import { validateInvite } from "@/lib/security/invites";
import { safeRedirectPath } from "@/lib/security/redirect";
import {
  checkRateLimit,
  resetRateLimitsForTests,
} from "@/lib/security/rate-limit";
import {
  validateUpload,
  extensionOf,
  randomStorageFilename,
} from "@/lib/security/storage";
import { presetPermissions } from "@/lib/members/permissions";
import type { FamilyMember, FamilySnapshot } from "@/lib/domain/types";

function snapshotAs(memberUserId: string): FamilySnapshot {
  const base = createDemoSnapshot();
  const member = base.members.find((m: FamilyMember) => m.userId === memberUserId);
  const profile = base.profiles[memberUserId];
  if (!member || !profile) throw new Error("Member not found");
  return { ...base, currentMember: member, currentProfile: profile };
}

describe("tenant isolation — partner permissions", () => {
  it("partner (Sanne) cannot edit custody", () => {
    const snap = snapshotAs(IDS.sanneUser);
    assert.equal(hasCapability(snap, "edit_custody"), false);
  });

  it("partner cannot manage family members", () => {
    const snap = snapshotAs(IDS.sanneUser);
    assert.equal(hasCapability(snap, "manage_family_members"), false);
  });

  it("partner cannot edit expenses with involved preset", () => {
    const snap = snapshotAs(IDS.sanneUser);
    assert.equal(hasCapability(snap, "edit_expenses"), false);
  });

  it("parent (Emma) has all capabilities", () => {
    const snap = snapshotAs(IDS.emmaUser);
    assert.equal(hasCapability(snap, "edit_custody"), true);
    assert.equal(hasCapability(snap, "manage_family_members"), true);
    assert.equal(hasCapability(snap, "edit_expenses"), true);
  });
});

describe("child-level access", () => {
  it("partner can view assigned child (Roxy)", () => {
    const snap = snapshotAs(IDS.sanneUser);
    assert.equal(hasChildCapability(snap, IDS.roxy, "view_child_basic"), true);
  });

  it("partner cannot edit child without canEdit override", () => {
    const snap = snapshotAs(IDS.sanneUser);
    assert.equal(hasChildCapability(snap, IDS.roxy, "edit_tasks"), false);
  });

  it("IDOR: child from another family would fail childInFamily check", () => {
    const snap = snapshotAs(IDS.sanneUser);
    const foreignChildId = "99999999-9999-4999-a999-999999999999";
    assert.equal(hasChildCapability(snap, foreignChildId, "view_child_basic"), false);
  });
});

describe("contact-only members", () => {
  it("oma Els has zero capabilities", () => {
    const snap = snapshotAs(IDS.emmaUser);
    const oma = snap.members.find((m: FamilyMember) => m.id === IDS.omaElsMember)!;
    const caps = memberCapabilities(oma);
    assert.equal(caps.size, 0);
  });
});

describe("invites", () => {
  it("rejects expired invite", () => {
    const result = validateInvite(
      {
        token: "abc",
        email: "a@b.nl",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        acceptedAt: null,
        revokedAt: null,
      },
      "a@b.nl",
    );
    assert.equal(result.valid, false);
  });

  it("rejects email mismatch", () => {
    const result = validateInvite(
      {
        token: "abc",
        email: "a@b.nl",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        acceptedAt: null,
        revokedAt: null,
      },
      "other@b.nl",
    );
    assert.equal(result.valid, false);
  });

  it("accepts valid invite", () => {
    const result = validateInvite(
      {
        token: "abc",
        email: "a@b.nl",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        acceptedAt: null,
        revokedAt: null,
      },
      "a@b.nl",
    );
    assert.equal(result.valid, true);
  });
});

describe("open redirect protection", () => {
  it("blocks external URLs", () => {
    assert.equal(safeRedirectPath("https://evil.com"), "/vandaag");
    assert.equal(safeRedirectPath("//evil.com"), "/vandaag");
  });

  it("allows internal paths", () => {
    assert.equal(safeRedirectPath("/vandaag"), "/vandaag");
    assert.equal(safeRedirectPath("/kinderen/abc"), "/kinderen/abc");
  });
});

describe("rate limiting", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("blocks after max attempts", () => {
    for (let i = 0; i < 10; i++) {
      assert.equal(checkRateLimit("login", "test@x.nl").allowed, true);
    }
    assert.equal(checkRateLimit("login", "test@x.nl").allowed, false);
  });
});

describe("storage validation", () => {
  it("rejects disallowed extensions", () => {
    assert.throws(() =>
      validateUpload({ filename: "malware.exe", mimeType: "application/pdf", sizeBytes: 100 }),
    );
  });

  it("accepts PDF", () => {
    assert.doesNotThrow(() =>
      validateUpload({ filename: "doc.pdf", mimeType: "application/pdf", sizeBytes: 100 }),
    );
  });

  it("generates random filenames", () => {
    const a = randomStorageFilename("receipt.pdf");
    const b = randomStorageFilename("receipt.pdf");
    assert.notEqual(a, b);
    assert.equal(extensionOf(a), "pdf");
  });
});

describe("care/travel least privilege", () => {
  it("practical preset partner has no document access", () => {
    const perms = presetPermissions("practical", "partner");
    const snap = snapshotAs(IDS.sanneUser);
    snap.currentMember.permissions = perms;
    snap.currentMember.permissionPreset = "practical";
    assert.equal(hasCapability(snap, "view_documents"), false);
    assert.equal(hasCapability(snap, "view_expenses"), false);
  });
});
