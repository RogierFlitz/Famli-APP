import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoSnapshot } from "@/lib/data/seed";
import { IDS } from "@/lib/data/ids";
import { applyPrivacy } from "@/lib/life/privacy";
import { parseIcsEvents } from "@/lib/calendar/providers/apple-ics";
import { memoryRepository } from "@/lib/data/memory-store";
import {
  buildCalendarIcs,
  calendarFeedUrls,
  collectFamliExportEvents,
  escapeText,
  foldLine,
  formatIcsUtc,
  inExportWindow,
  normalizeFeedToken,
  parseToUtc,
} from "@/lib/calendar/ics-export";
import type { FamilyMember, FamilySnapshot } from "@/lib/domain/types";

function snapshotAs(memberUserId: string): FamilySnapshot {
  const base = createDemoSnapshot();
  const member = base.members.find((item: FamilyMember) => item.userId === memberUserId);
  const profile = base.profiles[memberUserId];
  if (!member || !profile) throw new Error("Member not found");
  return applyPrivacy({ ...base, currentMember: member, currentProfile: profile });
}

describe("ICS export (Famli → externe agenda)", () => {
  it("normalizes feed tokens with optional .ics suffix", () => {
    assert.equal(normalizeFeedToken("abc.ics"), "abc");
    assert.equal(normalizeFeedToken("  abc.ICS  "), "abc");
  });

  it("escapes ICS text and folds long lines", () => {
    assert.equal(escapeText("A;B,C\nD\\E"), "A\\;B\\,C\\nD\\\\E");
    const folded = foldLine(`SUMMARY:${"x".repeat(90)}`);
    assert.ok(folded.includes("\r\n "));
    assert.ok(!folded.split("\r\n").some((line) => Buffer.from(line, "utf8").length > 75));
  });

  it("treats naive local times as Europe/Amsterdam", () => {
    const winter = parseToUtc("2026-01-15T14:00:00");
    assert.equal(formatIcsUtc(winter), "20260115T130000Z");
    const summer = parseToUtc("2026-07-15T14:00:00");
    assert.equal(formatIcsUtc(summer), "20260715T120000Z");
  });

  it("exports family events and round-trips through the ICS parser", () => {
    const snap = snapshotAs(IDS.emmaUser);
    const now = new Date("2026-08-31T10:00:00Z");
    const events = collectFamliExportEvents(snap, now);
    assert.ok(events.length > 0, "demo snapshot should yield export events");
    assert.ok(events.every((event) => event.uid.endsWith("@famli.app")));

    const ics = buildCalendarIcs(snap.family.name, events, now);
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(ics.includes("PRODID:-//Famli//Agenda//NL"));
    assert.match(ics, /DTSTART;VALUE=DATE:|DTSTART:\d{8}T\d{6}Z/);

    const parsed = parseIcsEvents(ics);
    assert.ok(parsed.length >= 1);
    assert.equal(parsed[0]?.title, events[0]?.title);
  });

  it("omits cancelled events and events outside the export window", () => {
    const snap = snapshotAs(IDS.emmaUser);
    const now = new Date("2026-08-31T10:00:00Z");
    const far = snap.events.find((event) => !inExportWindow(event.startsAt, now));
    const icsEvents = collectFamliExportEvents(snap, now);
    if (far) {
      assert.equal(icsEvents.some((item) => item.uid.startsWith(far.id)), false);
    }
    snap.events[0]!.cancelledAt = now.toISOString();
    const afterCancel = collectFamliExportEvents(snap, now);
    assert.equal(afterCancel.some((item) => item.uid.startsWith(snap.events[0]!.id)), false);
  });

  it("builds subscribe URLs for Google, Apple and Outlook", () => {
    const urls = calendarFeedUrls("tok_abc", "Famli");
    assert.ok(urls.httpsUrl.endsWith("/api/calendar/feed/tok_abc.ics"));
    assert.ok(urls.webcalUrl.startsWith("webcal://"));
    assert.ok(urls.googleUrl.includes("calendar.google.com"));
    assert.ok(urls.outlookUrl.includes("outlook.live.com"));
    assert.equal(urls.appleUrl, urls.webcalUrl);
  });

  it("issues a hashed feed token that resolves to the owner snapshot", async () => {
    const { token } = await memoryRepository.issueCalendarFeedToken(IDS.emmaUser, IDS.family);
    assert.ok(token.length >= 16);
    const status = await memoryRepository.getCalendarFeedStatus(IDS.emmaUser);
    assert.ok(status?.createdAt);

    const resolved = await memoryRepository.getCalendarFeedByToken(token);
    assert.equal(resolved?.snapshot.currentProfile.id, IDS.emmaUser);
    assert.ok((resolved?.snapshot.events.length ?? 0) > 0);

    await memoryRepository.revokeCalendarFeedToken(IDS.emmaUser);
    const after = await memoryRepository.getCalendarFeedByToken(token);
    assert.equal(after, null);
  });

  it("does not leak calendar events to contact-only members", () => {
    const snap = snapshotAs(IDS.emmaUser);
    const oma = snap.members.find((member) => member.id === IDS.omaElsMember)!;
    const filtered = applyPrivacy({ ...snap, currentMember: oma });
    const events = collectFamliExportEvents(filtered, new Date("2026-08-31T10:00:00Z"));
    assert.equal(events.length, 0);
  });
});
