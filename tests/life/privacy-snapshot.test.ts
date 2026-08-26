import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoSnapshot } from "@/lib/data/seed";
import { IDS } from "@/lib/data/ids";
import { applyPrivacy } from "@/lib/life/privacy";
import type { FamilyMember, FamilySnapshot } from "@/lib/domain/types";

function snapshotAs(memberUserId: string): FamilySnapshot {
  const base = createDemoSnapshot();
  const member = base.members.find((m: FamilyMember) => m.userId === memberUserId);
  const profile = base.profiles[memberUserId];
  if (!member || !profile) throw new Error("Member not found");
  return { ...base, currentMember: member, currentProfile: profile };
}

describe("life snapshot privacy", () => {
  it("parent sees life-domain collections from demo seed", () => {
    const snap = snapshotAs(IDS.emmaUser);
    const filtered = applyPrivacy(snap);
    assert.ok(filtered.neededItems.length > 0);
    assert.ok(filtered.travelPlans.length > 0);
    assert.ok(filtered.childUpdates.length > 0);
    assert.ok(filtered.sizes.length >= 2);
  });

  it("contact-only member sees no needed items", () => {
    const snap = snapshotAs(IDS.emmaUser);
    const oma = snap.members.find((m) => m.id === IDS.omaElsMember)!;
    const filtered = applyPrivacy({ ...snap, currentMember: oma });
    assert.equal(filtered.neededItems.length, 0);
    assert.equal(filtered.childUpdates.length, 0);
  });

  it("includes parties linked to calendar for parents", () => {
    const snap = snapshotAs(IDS.emmaUser);
    const filtered = applyPrivacy(snap);
    assert.ok(filtered.parties.length > 0);
  });

  it("filters expenses for partner without edit rights", () => {
    const snap = snapshotAs(IDS.sanneUser);
    const filtered = applyPrivacy(snap);
    assert.ok(snap.expenses.length > 0);
    assert.equal(filtered.expenses.length, snap.expenses.length);
    assert.ok(filtered.neededItems.length > 0);
  });
});
