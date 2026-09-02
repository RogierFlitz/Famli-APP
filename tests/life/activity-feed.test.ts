import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoSnapshot } from "@/lib/data/seed";
import { familyActivityFeed } from "@/lib/queries/activity-feed";
import type { ActivityLogEntry } from "@/lib/domain/types";

describe("family activity feed", () => {
  it("turns demo log entries into human sentences without raw payloads", () => {
    const now = new Date("2026-04-16T10:00:00.000Z");
    const snapshot = createDemoSnapshot(now);
    const items = familyActivityFeed(snapshot, now);
    assert.ok(items.length >= 1);
    assert.ok(items.some((item) => item.text.includes("verzoek") || item.text.includes("schema")));
    for (const item of items) {
      assert.equal("before" in item, false);
      assert.equal("after" in item, false);
      assert.doesNotMatch(item.text, /passport|bsn|json/i);
    }
  });

  it("ignores unknown actions and does not leak after JSON", () => {
    const now = new Date("2026-04-16T10:00:00.000Z");
    const snapshot = createDemoSnapshot(now);
    const secret: ActivityLogEntry = {
      id: "log-secret",
      familyId: snapshot.family.id,
      actorId: snapshot.currentProfile.id,
      action: "child.passport_updated",
      entityType: "child",
      entityId: snapshot.children[0].id,
      before: null,
      after: { passport: "X123", title: "should-not-show-because-unknown-action" },
      createdAt: now.toISOString(),
    };
    snapshot.activityLog.unshift(secret);
    const items = familyActivityFeed(snapshot, now);
    assert.ok(!items.some((item) => item.text.includes("X123")));
    assert.ok(!items.some((item) => item.text.includes("should-not-show")));
  });

  it("uses a safe event title when present", () => {
    const now = new Date("2026-04-16T10:00:00.000Z");
    const snapshot = createDemoSnapshot(now);
    snapshot.activityLog.unshift({
      id: "log-event",
      familyId: snapshot.family.id,
      actorId: snapshot.currentProfile.id,
      action: "event.created",
      entityType: "event",
      entityId: "evt-1",
      before: null,
      after: { title: "Hockey Roxy" },
      createdAt: now.toISOString(),
    });
    const items = familyActivityFeed(snapshot, now);
    assert.ok(items[0]?.text.includes("Hockey Roxy"));
    assert.equal(items[0]?.href.includes("/agenda"), true);
  });

  it("renders packing and handover-ready summaries without ids", () => {
    const now = new Date("2026-04-16T10:00:00.000Z");
    const snapshot = createDemoSnapshot(now);
    snapshot.activityLog.unshift({
      id: "log-pack",
      familyId: snapshot.family.id,
      actorId: snapshot.currentProfile.id,
      action: "packing_item.check",
      entityType: "packing_item",
      entityId: "pack-1",
      before: null,
      after: { summary: `${snapshot.currentProfile.firstName} vinkte Hockeystick af.` },
      createdAt: now.toISOString(),
    });
    const items = familyActivityFeed(snapshot, now);
    assert.ok(items[0]?.text.includes("Hockeystick"));
    assert.equal(items[0]?.text.includes("pack-1"), false);
  });
});
