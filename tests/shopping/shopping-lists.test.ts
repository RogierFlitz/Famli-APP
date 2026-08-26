import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoryRepository } from "@/lib/data/memory-store";
import { IDS } from "@/lib/data/ids";

describe("shopping lists — family isolation", () => {
  it("family A items are not visible to family B", async () => {
    const familyA = await memoryRepository.createFamily({
      userId: "user-a-1111-4111-a111-111111111111",
      firstName: "Anna",
      lastName: "A",
      email: "anna@example.com",
      familyName: "Gezin A",
      parentLabel: "Mama",
    });
    const familyB = await memoryRepository.createFamily({
      userId: "user-b-2222-4222-a222-222222222222",
      firstName: "Bert",
      lastName: "B",
      email: "bert@example.com",
      familyName: "Gezin B",
      parentLabel: "Papa",
    });

    const listA = (await memoryRepository.getShoppingLists(familyA.family.id))[0]!;
    const item = await memoryRepository.addShoppingItem({
      familyId: familyA.family.id,
      listId: listA.id,
      name: "Melk",
      createdBy: familyA.currentProfile.id,
    });

    const crossFamilyItems = await memoryRepository.getShoppingItems(listA.id, familyB.family.id);
    assert.equal(crossFamilyItems.length, 0);

    const ownItems = await memoryRepository.getShoppingItems(listA.id, familyA.family.id);
    assert.equal(ownItems.some((row) => row.id === item.id), true);
  });
});

describe("shopping lists — CRUD", () => {
  it("creates default list and supports multiple lists", async () => {
    const lists = await memoryRepository.getShoppingLists(IDS.family);
    assert.ok(lists.some((list) => list.isDefault && list.name === "Boodschappen"));

    const extra = await memoryRepository.createShoppingList({
      familyId: IDS.family,
      name: "Vakantie",
      createdBy: IDS.emmaUser,
    });
    const updated = await memoryRepository.getShoppingLists(IDS.family);
    assert.ok(updated.some((list) => list.id === extra.id));
  });

  it("adds, updates, toggles, deletes items and clears completed", async () => {
    const list = (await memoryRepository.getShoppingLists(IDS.family)).find((row) => row.isDefault)!;
    const created = await memoryRepository.addShoppingItem({
      familyId: IDS.family,
      listId: list.id,
      name: "Kaas",
      quantity: 1,
      unit: "stuk",
      category: "zuivel",
      createdBy: IDS.emmaUser,
    });
    assert.equal(created.completed, false);

    const updated = await memoryRepository.updateShoppingItem({
      id: created.id,
      actorUserId: IDS.emmaUser,
      note: "Jong belegen",
    });
    assert.equal(updated.note, "Jong belegen");

    const toggled = await memoryRepository.toggleShoppingItem(
      created.id,
      IDS.rogierUser,
      IDS.rogierMember,
    );
    assert.equal(toggled.completed, true);
    assert.equal(toggled.completedBy, IDS.rogierUser);

    const undone = await memoryRepository.toggleShoppingItem(
      created.id,
      IDS.rogierUser,
      IDS.rogierMember,
    );
    assert.equal(undone.completed, false);

    const completed = await memoryRepository.toggleShoppingItem(
      created.id,
      IDS.rogierUser,
      IDS.rogierMember,
    );
    assert.equal(completed.completed, true);

    const cleared = await memoryRepository.clearCompletedShoppingItems(list.id, IDS.emmaUser);
    assert.ok(cleared >= 1);

    const remaining = await memoryRepository.getShoppingItems(list.id, IDS.family);
    assert.equal(remaining.some((row) => row.id === created.id), false);
  });

  it("deletes a single item", async () => {
    const list = (await memoryRepository.getShoppingLists(IDS.family)).find((row) => row.isDefault)!;
    const created = await memoryRepository.addShoppingItem({
      familyId: IDS.family,
      listId: list.id,
      name: "Tosti",
      createdBy: IDS.emmaUser,
    });
    await memoryRepository.deleteShoppingItem(created.id, IDS.emmaUser);
    const items = await memoryRepository.getShoppingItems(list.id, IDS.family);
    assert.equal(items.some((row) => row.id === created.id), false);
  });

  it("renames and deletes non-default lists", async () => {
    const created = await memoryRepository.createShoppingList({
      familyId: IDS.family,
      name: "Drogist",
      createdBy: IDS.emmaUser,
    });
    const renamed = await memoryRepository.renameShoppingList(created.id, "Apotheek", IDS.emmaUser);
    assert.equal(renamed.name, "Apotheek");
    await memoryRepository.deleteShoppingList(created.id, IDS.emmaUser);
    const lists = await memoryRepository.getShoppingLists(IDS.family);
    assert.equal(lists.some((list) => list.id === created.id), false);
  });
});

describe("shopping categories", () => {
  it("infers category from item name", async () => {
    const { inferShoppingCategory } = await import("@/lib/shopping/categories");
    assert.equal(inferShoppingCategory("Melk"), "zuivel");
    assert.equal(inferShoppingCategory("Wasmiddel"), "huishouden");
    assert.equal(inferShoppingCategory("Onbekend product"), "overig");
  });
});
