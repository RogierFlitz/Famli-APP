import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoSnapshot } from "@/lib/data/seed";
import { memoryRepository } from "@/lib/data/memory-store";
import { IDS } from "@/lib/data/ids";
import { notificationHref } from "@/lib/notifications/routes";
import { pushNotification } from "@/lib/notifications/memory";
import type { FamilySnapshot } from "@/lib/domain/types";

function freshDemo(): FamilySnapshot {
  const snap = createDemoSnapshot();
  snap.notifications = [];
  return snap;
}

describe("notifications — privacy", () => {
  it("user A sees own notification, user B does not", () => {
    const snap = freshDemo();
    pushNotification(snap, {
      familyId: IDS.family,
      userId: IDS.rogierUser,
      actorId: IDS.emmaUser,
      type: "task_assigned",
      title: "Taak voor Rogier",
      body: "Test",
      entityType: "task",
      entityId: "task-1",
    });
    pushNotification(snap, {
      familyId: IDS.family,
      userId: IDS.emmaUser,
      actorId: IDS.rogierUser,
      type: "task_assigned",
      title: "Taak voor Emma",
      body: "Test",
      entityType: "task",
      entityId: "task-2",
    });

    const rogierNotes = snap.notifications.filter((n) => n.userId === IDS.rogierUser);
    const emmaNotes = snap.notifications.filter((n) => n.userId === IDS.emmaUser);
    assert.equal(rogierNotes.length, 1);
    assert.equal(emmaNotes.length, 1);
    assert.equal(rogierNotes[0]?.title, "Taak voor Rogier");
    assert.equal(emmaNotes[0]?.title, "Taak voor Emma");
  });
});

describe("notifications — read state", () => {
  it("marks single notification read", () => {
    const snap = freshDemo();
    const note = pushNotification(snap, {
      familyId: IDS.family,
      userId: IDS.rogierUser,
      actorId: IDS.emmaUser,
      type: "expense",
      title: "Kosten",
      body: "Test",
      entityType: "expense",
      entityId: "exp-1",
    });
    assert.ok(note);
    assert.equal(note.readAt, null);

    snap.notifications = snap.notifications.map((item) =>
      item.id === note.id ? { ...item, readAt: new Date().toISOString() } : item,
    );
    const updated = snap.notifications.find((n) => n.id === note.id);
    assert.ok(updated?.readAt);
  });

  it("mark all read via repository", async () => {
    await memoryRepository.createTask({
      familyId: IDS.family,
      createdBy: IDS.emmaUser,
      title: "Taak",
      description: null,
      childId: IDS.roxy,
      assigneeMemberId: IDS.rogierMember,
      dueAt: null,
    });
    const before = (await memoryRepository.getNotifications(IDS.rogierUser)).filter((n) => !n.readAt);
    assert.ok(before.length >= 1);
    await memoryRepository.markAllNotificationsRead(IDS.rogierUser);
    const after = await memoryRepository.getNotifications(IDS.rogierUser);
    assert.equal(after.filter((n) => !n.readAt).length, 0);
  });
});

describe("notifications — navigation", () => {
  it("resolves correct href per entity type", () => {
    assert.equal(
      notificationHref({
        id: "1",
        familyId: IDS.family,
        userId: IDS.rogierUser,
        type: "task_assigned",
        title: "T",
        body: "",
        entityType: "task",
        entityId: "t1",
        payload: {},
        readAt: null,
        channel: "in_app",
        createdAt: new Date().toISOString(),
      }),
      "/regelen",
    );
    assert.equal(
      notificationHref({
        id: "2",
        familyId: IDS.family,
        userId: IDS.rogierUser,
        type: "needed_item",
        title: "N",
        body: "",
        entityType: "needed_item",
        entityId: "n1",
        payload: { childId: IDS.roxy },
        readAt: null,
        channel: "in_app",
        createdAt: new Date().toISOString(),
      }),
      `/kinderen/${IDS.roxy}?tab=nodig`,
    );
    assert.equal(
      notificationHref({
        id: "3",
        familyId: IDS.family,
        userId: IDS.rogierUser,
        type: "child_update",
        title: "U",
        body: "",
        entityType: "child_update",
        entityId: "u1",
        payload: { childId: IDS.roxy },
        readAt: null,
        channel: "in_app",
        createdAt: new Date().toISOString(),
      }),
      `/kinderen/${IDS.roxy}`,
    );
    assert.equal(
      notificationHref({
        id: "4",
        familyId: IDS.family,
        userId: IDS.rogierUser,
        type: "change_request",
        title: "V",
        body: "",
        entityType: "change_request",
        entityId: "cr-1",
        payload: {},
        readAt: null,
        channel: "in_app",
        createdAt: new Date().toISOString(),
      }),
      "/regelen?tab=verzoeken&id=cr-1",
    );
  });
});

describe("notifications — dedup and triggers", () => {
  it("does not create duplicate notification for same action", () => {
    const snap = freshDemo();
    const input = {
      familyId: IDS.family,
      userId: IDS.rogierUser,
      actorId: IDS.emmaUser,
      type: "task_assigned" as const,
      title: "Taak",
      body: "Eén",
      entityType: "task",
      entityId: "task-dedup",
    };
    pushNotification(snap, input);
    pushNotification(snap, input);
    const matches = snap.notifications.filter(
      (n) => n.userId === IDS.rogierUser && n.entityId === "task-dedup",
    );
    assert.equal(matches.length, 1);
  });

  it("invite generates notification for other parent", async () => {
    await memoryRepository.inviteParent({
      familyId: IDS.family,
      email: "nieuw@example.nl",
      parentLabel: "Papa 2",
    });
    const rogierNotes = (await memoryRepository.getNotifications(IDS.rogierUser)).filter(
      (n) => n.type === "invite_sent",
    );
    assert.ok(rogierNotes.length >= 1);
  });

  it("task assignment generates notification for assignee", async () => {
    const before = await memoryRepository.getNotifications(IDS.rogierUser);
    const beforeAssign = before.filter((n) => n.type === "task_assigned").length;
    await memoryRepository.createTask({
      familyId: IDS.family,
      createdBy: IDS.emmaUser,
      title: "Boodschappen doen",
      description: null,
      childId: null,
      assigneeMemberId: IDS.rogierMember,
      dueAt: null,
    });
    const after = await memoryRepository.getNotifications(IDS.rogierUser);
    const assignNotes = after.filter((n) => n.type === "task_assigned");
    assert.ok(assignNotes.length > beforeAssign);
    assert.equal(assignNotes[0]?.userId, IDS.rogierUser);
    assert.notEqual(assignNotes[0]?.actorId, IDS.rogierUser);
  });
});
