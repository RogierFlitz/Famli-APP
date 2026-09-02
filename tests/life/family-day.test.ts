import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoSnapshot } from "@/lib/data/seed";
import { IDS } from "@/lib/data/ids";
import { addDaysIso, calendarDateInTimeZone, matchesDailyBriefSlot } from "@/lib/dates";
import { applyPrivacy } from "@/lib/life/privacy";
import {
  buildFamilyDayContext,
  famliMorgenEmailCopy,
  familyCalendarDate,
  inAppFamliMorgenBody,
} from "@/lib/context/family-day";
import type { FamilyMember, FamilySnapshot } from "@/lib/domain/types";

function asMember(snap: FamilySnapshot, userId: string): FamilySnapshot {
  const member = snap.members.find((row: FamilyMember) => row.userId === userId);
  const profile = snap.profiles[userId];
  if (!member || !profile) throw new Error("member missing");
  return { ...snap, currentMember: member, currentProfile: profile };
}

function mondayEvening() {
  return new Date("2026-04-13T18:00:00+02:00");
}

describe("calendarDateInTimeZone", () => {
  it("uses Amsterdam date, not UTC, around midnight", () => {
    const lateUtc = new Date("2026-04-13T23:30:00.000Z");
    assert.equal(calendarDateInTimeZone(lateUtc, "UTC"), "2026-04-13");
    assert.equal(calendarDateInTimeZone(lateUtc, "Europe/Amsterdam"), "2026-04-14");
  });

  it("matches the daily brief hour in the family timezone", () => {
    const atEight = new Date("2026-04-13T18:10:00.000Z");
    assert.equal(matchesDailyBriefSlot(atEight, "Europe/Amsterdam", "20:00"), true);
    assert.equal(matchesDailyBriefSlot(atEight, "UTC", "20:00"), false);
  });
});

describe("Famli Morgen context — scenarios A–E", () => {
  it("A: school, hockey, stay, transport and packing for tomorrow", () => {
    const now = mondayEvening();
    const snapshot = createDemoSnapshot(now);
    const today = familyCalendarDate(snapshot, now);
    const tomorrow = addDaysIso(today, 1);
    const ctx = buildFamilyDayContext(snapshot, tomorrow, now);
    const roxy = ctx.children.find((child) => child.childId === IDS.roxy);
    assert.ok(roxy);
    assert.equal(roxy.stayUnknown, false);
    assert.match(roxy.stayLabel, /bij/i);
    const titles = roxy.timeline.map((row) => row.title.toLowerCase());
    assert.ok(titles.some((title) => title.includes("school")));
    assert.ok(titles.some((title) => title.includes("hockey")));
    const roxyPacking = ctx.packing.filter((item) => item.childId === IDS.roxy);
    assert.ok(roxyPacking.length >= 3, `expected packing items, got ${roxyPacking.map((i) => i.label).join(", ")}`);
    assert.ok(roxyPacking.some((item) => /stick|hockeystick/i.test(item.label)));
    assert.ok(roxyPacking.some((item) => /bidon/i.test(item.label)));
    const labels = roxyPacking.map((item) => item.label.toLowerCase());
    assert.equal(labels.length, new Set(labels).size);
  });

  it("B: hockey without a driver asks who brings the child", () => {
    const now = mondayEvening();
    const snapshot = createDemoSnapshot(now);
    const tomorrow = addDaysIso(familyCalendarDate(snapshot, now), 1);
    for (const event of snapshot.events) {
      if (/hockey/i.test(event.title) && event.startsAt.startsWith(tomorrow)) {
        event.dropoffMemberId = null;
      }
    }
    const ctx = buildFamilyDayContext(snapshot, tomorrow, now);
    assert.ok(
      ctx.alerts.some((alert) => /wie brengt/i.test(alert.title) && /hockey/i.test(alert.title)),
      ctx.alerts.map((a) => a.title).join(" | "),
    );
    assert.ok(!/WARNING/i.test(ctx.alerts.map((a) => a.title).join(" ")));
  });

  it("C: everything handled yields ready copy and no alerts", () => {
    const now = mondayEvening();
    const snapshot = createDemoSnapshot(now);
    const tomorrow = addDaysIso(familyCalendarDate(snapshot, now), 1);
    snapshot.packingItems = snapshot.packingItems.map((item) =>
      item.dueOn === tomorrow ? { ...item, checked: true } : item,
    );
    snapshot.tasks = snapshot.tasks.map((task) =>
      task.dueAt?.slice(0, 10) === tomorrow ? { ...task, status: "done" as const } : task,
    );
    snapshot.neededItems = snapshot.neededItems.map((item) =>
      item.dueOn === tomorrow || (item.eventId && snapshot.events.some((event) => event.id === item.eventId && event.startsAt.startsWith(tomorrow)))
        ? { ...item, status: "gekocht" as const }
        : item,
    );
    const ctx = buildFamilyDayContext(snapshot, tomorrow, now);
    assert.equal(ctx.ready, true, ctx.alerts.map((a) => a.title).join(" | "));
    assert.equal(ctx.alerts.length, 0);
    assert.match(ctx.intro, /staat klaar/);
  });

  it("D: contact-only member does not receive calendar or children", () => {
    const now = mondayEvening();
    const base = createDemoSnapshot(now);
    const oma = base.members.find((row) => row.id === IDS.omaElsMember)!;
    const filtered = applyPrivacy({ ...base, currentMember: oma });
    const tomorrow = addDaysIso(familyCalendarDate(filtered, now), 1);
    const ctx = buildFamilyDayContext(filtered, tomorrow, now);
    assert.equal(ctx.children.length, 0);
    assert.equal(ctx.counts.events, 0);
    assert.equal(ctx.quiet, true);
  });

  it("E: a day without events is rustig, not an empty technical screen", () => {
    const now = mondayEvening();
    const snapshot = createDemoSnapshot(now);
    const ctx = buildFamilyDayContext(snapshot, "2099-01-01", now);
    assert.equal(ctx.quiet, true);
    assert.match(ctx.intro, /rustig/);
    assert.equal(ctx.alerts.length, 0);
    assert.equal(ctx.packing.length, 0);
  });
});

describe("Famli Morgen privacy-safe copy", () => {
  it("in-app and email copy never include child names", () => {
    const now = mondayEvening();
    const snapshot = asMember(createDemoSnapshot(now), IDS.emmaUser);
    const tomorrow = addDaysIso(familyCalendarDate(snapshot, now), 1);
    const ctx = buildFamilyDayContext(snapshot, tomorrow, now);
    const inApp = inAppFamliMorgenBody(ctx);
    const email = famliMorgenEmailCopy(ctx);
    for (const child of snapshot.children) {
      assert.equal(inApp.includes(child.firstName), false);
      assert.equal(email.body.includes(child.firstName), false);
      assert.equal(email.subject.includes(child.firstName), false);
    }
    assert.match(email.body, /afspraken/);
  });
});
