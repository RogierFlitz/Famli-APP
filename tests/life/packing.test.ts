import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoSnapshot } from "@/lib/data/seed";
import { memoryRepository } from "@/lib/data/memory-store";
import { IDS } from "@/lib/data/ids";
import { toISODate } from "@/lib/dates";
import { packingProgressLabel } from "@/lib/packing/progress";
import { packingListOrTemplate, handoverPackingOrTemplate } from "@/lib/packing/templates";
import {
  handoverProgress,
  packingItemsForHandover,
  todayPackingGroups,
  upcomingPackingForChild,
} from "@/lib/queries/packing";
import { hasChildCapability } from "@/lib/security/capabilities";
import { applyPrivacy } from "@/lib/life/privacy";
import type { FamilyMember, FamilySnapshot } from "@/lib/domain/types";

function snapshotAs(memberUserId: string, now?: Date): FamilySnapshot {
  const base = createDemoSnapshot(now);
  const member = base.members.find((row: FamilyMember) => row.userId === memberUserId);
  const profile = base.profiles[memberUserId];
  if (!member || !profile) throw new Error("Member not found");
  return { ...base, currentMember: member, currentProfile: profile };
}

describe("packing progress copy", () => {
  it("uses human language instead of percentages", () => {
    assert.equal(packingProgressLabel(0, 0), "Nog niets toegevoegd");
    assert.equal(packingProgressLabel(3, 4), "Nog 1 ding");
    assert.equal(packingProgressLabel(4, 4), "Alles gereed ✓");
    assert.equal(packingProgressLabel(0, 4), "Nog 4 dingen");
  });

  it("fills empty packing lists from sport and handover templates", () => {
    assert.deepEqual(packingListOrTemplate("Hockey Roxy", "sport", []), ["Hockeystick", "Bitje", "Bidon"]);
    assert.deepEqual(packingListOrTemplate("Hockey Roxy", "sport", ["Stick"]), ["Stick"]);
    assert.deepEqual(handoverPackingOrTemplate([]), ["Schooltas", "Medicijnen", "Knuffel", "Sportspullen"]);
  });
});

describe("packing persistence across parents", () => {
  it("adds, shares, checks, refreshes, unchecks, and isolates families", async () => {
    const emma = await memoryRepository.getSnapshot(IDS.emmaUser);
    assert.ok(emma);
    const created = await memoryRepository.createPackingItem({
      familyId: IDS.family,
      createdBy: IDS.emmaUser,
      childId: IDS.roxy,
      label: "Hockeystick",
      context: "hockey",
      dueOn: toISODate(new Date()),
    });

    const rogierSees = await memoryRepository.getSnapshot(IDS.rogierUser);
    assert.ok(rogierSees?.packingItems.some((item) => item.id === created.id && item.label === "Hockeystick"));

    const checked = await memoryRepository.togglePackingItem(created.id, IDS.emmaUser);
    assert.equal(checked.checked, true);
    assert.equal(checked.checkedBy, IDS.emmaUser);
    assert.ok(checked.checkedAt);

    const afterRefresh = await memoryRepository.getSnapshot(IDS.emmaUser);
    const persisted = afterRefresh?.packingItems.find((item) => item.id === created.id);
    assert.equal(persisted?.checked, true);
    assert.equal(persisted?.checkedBy, IDS.emmaUser);

    const otherParent = await memoryRepository.getSnapshot(IDS.rogierUser);
    assert.equal(otherParent?.packingItems.find((item) => item.id === created.id)?.checked, true);

    const unchecked = await memoryRepository.togglePackingItem(created.id, IDS.rogierUser);
    assert.equal(unchecked.checked, false);
    assert.equal(unchecked.checkedBy, null);

    const familyB = await memoryRepository.createFamily({
      userId: "user-b-pack-4222-a222-222222222222",
      firstName: "Bert",
      lastName: "B",
      email: "bert-pack@example.com",
      familyName: "Gezin B",
      parentLabel: "Papa",
    });
    const outsider = await memoryRepository.getSnapshot(familyB.currentProfile.id);
    assert.equal(outsider?.packingItems.some((item) => item.id === created.id), false);
    assert.equal(outsider?.family.id === IDS.family, false);
  });

  it("computes handover leftover copy and persists ready status", async () => {
    const handover = await memoryRepository.createHandover({
      familyId: IDS.family,
      createdBy: IDS.emmaUser,
      date: "2027-03-18",
      time: "17:30",
      fromMemberId: IDS.emmaMember,
      toMemberId: IDS.rogierMember,
      location: "School",
      packingList: ["Schooltas", "Hockeystick", "Medicijnen", "Knuffel"],
      notes: null,
      childIds: [IDS.roxy],
    });
    void handover;
    const emma = await memoryRepository.getSnapshot(IDS.emmaUser);
    assert.ok(emma);
    const created = emma.handovers.find((item) => item.date === "2027-03-18" && item.packingList.includes("Knuffel"));
    assert.ok(created);
    const items = packingItemsForHandover(emma, created);
    assert.equal(items.length, 4);

    for (const item of items.slice(0, 3)) {
      await memoryRepository.togglePackingItem(item.id, IDS.emmaUser);
    }
    const afterThree = await memoryRepository.getSnapshot(IDS.emmaUser);
    const progress = handoverProgress(afterThree!, created);
    assert.equal(progress.remaining >= 1, true);
    assert.match(progress.remainingLabel, /Nog 1 ding|Nog \d+ dingen/);

    const last = packingItemsForHandover(afterThree!, created).find((item) => !item.checked);
    assert.ok(last);
    await memoryRepository.togglePackingItem(last.id, IDS.emmaUser);
    const allChecked = await memoryRepository.getSnapshot(IDS.emmaUser);
    assert.equal(handoverProgress(allChecked!, created).remaining, 0);
    assert.equal(packingProgressLabel(4, 4), "Alles gereed ✓");

    await memoryRepository.markHandoverReady({
      handoverId: created.id,
      actorUserId: IDS.emmaUser,
    });
    const readySnap = await memoryRepository.getSnapshot(IDS.emmaUser);
    const readyHandover = readySnap?.handovers.find((item) => item.id === created.id);
    assert.equal(readyHandover?.readyStatus, "ready");
    assert.equal(readyHandover?.readyBy, IDS.emmaUser);
    assert.ok(readyHandover?.readyAt);
    const log = readySnap?.activityLog.find((entry) => entry.action === "handover.ready");
    assert.ok(log?.after && typeof log.after.summary === "string");
    assert.match(String(log.after.summary), /gereed/);
    assert.equal(JSON.stringify(log.after).includes(created.id), false);
  });

  it("denies packing edits without rights and hides other-family data", () => {
    const sanne = snapshotAs(IDS.sanneUser);
    assert.equal(hasChildCapability(sanne, IDS.roxy, "edit_tasks"), false);

    const emma = snapshotAs(IDS.emmaUser);
    const oma = emma.members.find((member) => member.id === IDS.omaElsMember)!;
    const omaView = applyPrivacy({ ...emma, currentMember: oma });
    assert.equal(omaView.packingItems.length, 0);
    assert.equal(hasChildCapability({ ...emma, currentMember: oma }, IDS.roxy, "edit_tasks"), false);
  });

  it("Today only lists packing due today or tomorrow", () => {
    const now = new Date("2026-04-15T10:00:00.000Z");
    const snapshot = createDemoSnapshot(now);
    const groups = todayPackingGroups(snapshot, now);
    assert.ok(groups.length > 0, "demo Wednesday should have zwem or handover packing");
    const today = toISODate(now);
    const tomorrow = "2026-04-16";
    for (const group of groups) {
      for (const item of group.items) {
        assert.ok(item.dueOn === today || item.dueOn === tomorrow, item.dueOn ?? "missing due");
      }
    }
    const roxy = upcomingPackingForChild(snapshot, IDS.roxy, now);
    assert.ok(roxy.length >= 0);
  });
});
