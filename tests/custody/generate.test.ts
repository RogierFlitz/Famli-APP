import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { custodianForDate } from "@/lib/custody/generate";
import type { CustodySchedule } from "@/lib/domain/types";

function schedule(
  patternType: CustodySchedule["patternType"],
  config: CustodySchedule["config"],
  startsOn = "2026-01-05",
): CustodySchedule {
  return {
    id: "sched_test",
    familyId: "fam_test",
    name: "Test",
    patternType,
    config,
    startsOn,
    endsOn: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00",
    updatedAt: "2026-01-01T00:00:00",
    createdBy: "user_test",
  };
}

describe("custody generate", () => {
  it("custom dayCycle repeats from schedule start", () => {
    const item = schedule("custom", {
      parentAMemberId: "parent_a",
      parentBMemberId: "parent_b",
      dayCycle: ["parent_a", "parent_b", "parent_a"],
    });

    assert.equal(custodianForDate(item, "2026-01-05"), "parent_a");
    assert.equal(custodianForDate(item, "2026-01-06"), "parent_b");
    assert.equal(custodianForDate(item, "2026-01-07"), "parent_a");
    assert.equal(custodianForDate(item, "2026-01-08"), "parent_a");
  });

  it("fixed weekdays uses weekdayMemberIds (Monday-based)", () => {
    const item = schedule("fixed_weekdays", {
      parentAMemberId: "parent_a",
      parentBMemberId: "parent_b",
      weekdayMemberIds: [
        "parent_a",
        "parent_a",
        "parent_b",
        "parent_b",
        "parent_a",
        "parent_b",
        "parent_b",
      ],
    });

    assert.equal(custodianForDate(item, "2026-01-05"), "parent_a");
    assert.equal(custodianForDate(item, "2026-01-06"), "parent_a");
    assert.equal(custodianForDate(item, "2026-01-07"), "parent_b");
    assert.equal(custodianForDate(item, "2026-01-10"), "parent_b");
    assert.equal(custodianForDate(item, "2026-01-11"), "parent_b");
  });

  it("custom without dayCycle falls back to parent A", () => {
    const item = schedule("custom", {
      parentAMemberId: "parent_a",
      parentBMemberId: "parent_b",
    });

    assert.equal(custodianForDate(item, "2026-01-05"), "parent_a");
    assert.equal(custodianForDate(item, "2026-01-12"), "parent_a");
  });
});
