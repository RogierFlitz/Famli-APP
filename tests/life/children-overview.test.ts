import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoSnapshot } from "@/lib/data/seed";
import { existingChildRecord, uniqueById } from "@/lib/family/unique";
import { childrenOverview } from "@/lib/queries/children-overview";
import type { Child } from "@/lib/domain/types";

describe("children uniqueness", () => {
  it("drops repeated ids from the same list", () => {
    const snap = createDemoSnapshot();
    const doubled = uniqueById([...snap.children, ...snap.children]);
    assert.equal(doubled.length, snap.children.length);
    assert.equal(new Set(doubled.map((child) => child.id)).size, doubled.length);
  });

  it("does not merge different records that share a first name", () => {
    const snap = createDemoSnapshot();
    const copy: Child = {
      ...snap.children[0],
      id: "99999999-9999-4999-a999-999999999999",
    };
    const kept = uniqueById([...snap.children, copy]);
    assert.equal(kept.filter((child) => child.firstName === snap.children[0].firstName).length, 2);
  });

  it("finds an existing child by name and birth date", () => {
    const snap = createDemoSnapshot();
    const child = snap.children[0];
    const match = existingChildRecord(snap.children, child.firstName.toUpperCase(), child.dateOfBirth);
    assert.equal(match?.id, child.id);
    assert.equal(existingChildRecord(snap.children, "Katelynn", "2014-01-01"), undefined);
  });
});

describe("children overview cards", () => {
  it("builds compact cards without empty forced sections", () => {
    const snap = createDemoSnapshot(new Date("2026-04-15T10:00:00.000Z"));
    const overview = childrenOverview(snap, new Date("2026-04-15T10:00:00.000Z"));
    assert.ok(overview.cards.length >= 1);
    for (const card of overview.cards) {
      assert.ok(card.stayHeadline.length > 0);
      assert.notEqual(card.stayHeadline, "Nog niet ingepland");
      assert.ok(card.attention.length <= 2);
    }
  });

  it("sorts children with today actions first", () => {
    const snap = createDemoSnapshot(new Date("2026-04-14T10:00:00.000Z"));
    const overview = childrenOverview(snap, new Date("2026-04-14T10:00:00.000Z"));
    const ids = overview.cards.map((card) => card.child.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});
