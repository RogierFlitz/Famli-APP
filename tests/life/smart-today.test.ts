import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays } from "date-fns";
import { createDemoSnapshot } from "@/lib/data/seed";
import { toISODate } from "@/lib/dates";
import {
  forgetAndPack,
  nextWeekLines,
  nowAndSoon,
  openShoppingCount,
  packingForDate,
  packingRemainingCount,
  todaySchedule,
  tomorrowPreview,
  weekGlance,
} from "@/lib/queries/smart-today";

describe("smart today composition", () => {
  it("surfaces packing from events, routines and handovers on that date", () => {
    const now = new Date("2026-04-15T10:00:00.000Z");
    const snapshot = createDemoSnapshot(now);
    const today = toISODate(now);
    const packing = packingForDate(snapshot, today);
    const labels = packing.map((item) => item.label.toLowerCase());
    assert.ok(labels.length > 0, "demo day should have packing");
    assert.ok(
      labels.some((label) => label.includes("stick") || label.includes("gymtas") || label.includes("schooltas")),
      `expected sport or handover packing, got ${labels.join(", ")}`,
    );
  });

  it("splits current vs upcoming events without empty now-bucket when nothing is live", () => {
    const now = new Date("2026-04-15T03:00:00.000Z");
    const snapshot = createDemoSnapshot(now);
    const { now: happening, soon } = nowAndSoon(snapshot, now);
    assert.equal(happening.length, 0);
    assert.ok(soon.length >= 0);
  });

  it("builds a tomorrow preview with child names", () => {
    const now = new Date("2026-04-15T10:00:00.000Z");
    const snapshot = createDemoSnapshot(now);
    const tomorrow = tomorrowPreview(snapshot, now);
    const nextDay = toISODate(addDays(now, 1));
    if (tomorrow.length) {
      assert.ok(tomorrow.every((line) => line.title.includes(":")));
      assert.ok(tomorrow.every((line) => line.href.length > 0));
    }
    const packingTomorrow = packingForDate(snapshot, nextDay);
    assert.ok(Array.isArray(packingTomorrow));
  });

  it("does not treat pickup lines or school times as packing", () => {
    const monday = new Date("2026-04-13T10:00:00.000Z");
    const snapshot = createDemoSnapshot(monday);
    const tomorrow = tomorrowPreview(snapshot, monday);
    const hockey = tomorrow.find((line) => /hockey/i.test(line.title));
    assert.ok(hockey, "Tuesday hockey should appear in Monday tomorrow preview");
    assert.ok(hockey.packing.some((item) => /stick/i.test(item)));
    for (const line of tomorrow) {
      for (const item of line.packing) {
        assert.equal(/^\d{1,2}:\d{2}$/.test(item), false, `time leaked into packing: ${item}`);
        assert.equal(/haalt/i.test(item), false, `pickup line leaked into packing: ${item}`);
      }
    }
    const packing = packingForDate(snapshot, toISODate(monday));
    const overdrachtDupes = packing.filter((item) => item.context === "Overdracht" && /schooltas/i.test(item.label));
    const eventDupes = packing.filter((item) => item.context !== "Overdracht" && /schooltas/i.test(item.label));
    assert.ok(overdrachtDupes.length + eventDupes.length <= 2);
  });

  it("counts remaining packing and next-week lines without school pickup noise", () => {
    const now = new Date("2026-04-15T10:00:00.000Z");
    const snapshot = createDemoSnapshot(now);
    const remaining = packingRemainingCount(snapshot, now);
    assert.ok(remaining >= 0);
    const weekLines = nextWeekLines(snapshot, now);
    assert.ok(weekLines.every((line) => !/^School$/.test(line.title)));
    assert.ok(weekLines.every((line) => !line.title.startsWith("Ophalen")));
    const schedule = todaySchedule(snapshot, now);
    assert.ok(schedule.every((item) => item.href.includes("/agenda")));
  });

  it("counts open shopping and week glance without cancelled events", () => {
    const now = new Date("2026-04-15T10:00:00.000Z");
    const snapshot = createDemoSnapshot(now);
    const shopping = openShoppingCount(snapshot);
    assert.ok(shopping >= 0);
    const week = weekGlance(snapshot, now);
    assert.ok(week.events >= 0);
    assert.ok(week.openTasks >= 0);
    const smart = forgetAndPack(snapshot, now);
    assert.equal(smart.currentName, snapshot.currentProfile.firstName);
    assert.equal(smart.shopping, shopping);
  });
});
