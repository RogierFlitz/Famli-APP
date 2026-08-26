import { requireSnapshot } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { hasCapability } from "@/lib/security/capabilities";
import { ShoppingListView } from "@/components/shopping/shopping-list-view";
import { ShoppingNotActivated } from "@/components/shopping/shopping-not-activated";
import { ShoppingNotActivatedError } from "@/lib/shopping/errors";

export default async function BoodschappenPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>;
}) {
  const snapshot = await requireSnapshot();
  const params = await searchParams;

  try {
    const lists = await getRepository().getShoppingLists(snapshot.family.id);
    const activeList =
      lists.find((list) => list.id === params.list) ??
      lists.find((list) => list.isDefault) ??
      lists[0];
    const items = activeList
      ? await getRepository().getShoppingItems(activeList.id, snapshot.family.id)
      : [];
    const canEdit = hasCapability(snapshot, "edit_tasks");

    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">Boodschappen</h1>
          <p className="mt-1 text-[color:var(--famli-muted)]">
            Gedeelde lijst voor {snapshot.family.name}
          </p>
        </header>
        <ShoppingListView
          snapshot={{ ...snapshot, shoppingLists: lists, shoppingItems: items }}
          lists={lists}
          items={items}
          activeListId={activeList?.id ?? ""}
          canEdit={canEdit}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof ShoppingNotActivatedError) {
      return <ShoppingNotActivated familyName={snapshot.family.name} />;
    }
    throw error;
  }
}
