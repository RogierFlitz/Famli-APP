import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyPrivacy } from "@/lib/calendar/providers";
import { sanitizeExternalEvent } from "@/lib/calendar/sanitize";

describe("calendar privacy sanitization", () => {
  const raw = {
    id: "evt-1",
    userId: "owner-user",
    provider: "google" as const,
    startsAt: "2026-08-26T10:00:00.000Z",
    endsAt: "2026-08-26T11:00:00.000Z",
    title: "Therapie",
    location: "Amsterdam",
    allDay: false,
  };

  it("owner always sees full details", () => {
    const result = sanitizeExternalEvent(raw, "hidden", "owner-user", "member-owner");
    assert.ok(result);
    assert.equal(result.title, "Therapie");
    assert.equal(result.location, "Amsterdam");
    assert.equal(result.isOwn, true);
    assert.equal(result.isBusyOnly, false);
  });

  it("busy mode hides details from others", () => {
    const result = sanitizeExternalEvent(raw, "busy", "other-user", "member-owner");
    assert.ok(result);
    assert.equal(result.title, "Bezet");
    assert.equal(result.location, null);
    assert.equal(result.isBusyOnly, true);
  });

  it("full mode shares title and location with others", () => {
    const result = sanitizeExternalEvent(raw, "full", "other-user", "member-owner");
    assert.ok(result);
    assert.equal(result.title, "Therapie");
    assert.equal(result.location, "Amsterdam");
    assert.equal(result.isBusyOnly, false);
  });

  it("hidden mode removes events for others", () => {
    const result = sanitizeExternalEvent(raw, "hidden", "other-user", "member-owner");
    assert.equal(result, null);
  });

  it("applyPrivacy provider helper matches modes", () => {
    assert.equal(applyPrivacy({ id: "1", startsAt: raw.startsAt, endsAt: raw.endsAt, title: raw.title }, "hidden"), null);
    assert.equal(
      applyPrivacy({ id: "1", startsAt: raw.startsAt, endsAt: raw.endsAt, title: raw.title }, "busy")?.title,
      "Bezet",
    );
  });
});
