import { requireSnapshot } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { hasCapability } from "@/lib/security/capabilities";
import { ShoppingListView } from "@/components/shopping/shopping-list-view";
import { ShoppingLoadError } from "@/components/shopping/shopping-load-error";
import { ShoppingNotActivated } from "@/components/shopping/shopping-not-activated";
import { isShoppingNotActivatedError } from "@/lib/shopping/errors";
import { PageHeader } from "@/components/ui/page-header";

function isNextInternalNavigationError(error: unknown): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("digest" in error) ||
    typeof (error as { digest?: unknown }).digest !== "string"
  ) {
    return false;
  }
  const digest = (error as { digest: string }).digest;
  return digest.startsWith("NEXT_REDIRECT") || digest === "DYNAMIC_SERVER_USAGE";
}

export default async function BoodschappenPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>;
}) {
  let snapshot;
  try {
    snapshot = await requireSnapshot();
  } catch (error) {
    if (isNextInternalNavigationError(error)) throw error;
    console.error("[boodschappen] snapshot laden mislukt:", error);
    return <ShoppingLoadError message="Kon je gezinsgegevens niet laden. Log opnieuw in of vernieuw de pagina." />;
  }

  const params = await searchParams;

  let lists;
  let items;
  let activeList;
  let canEdit;

  try {
    lists = await getRepository().getShoppingLists(snapshot.family.id);
    activeList =
      lists.find((list) => list.id === params.list) ??
      lists.find((list) => list.isDefault) ??
      lists[0];
    items = activeList
      ? await getRepository().getShoppingItems(activeList.id, snapshot.family.id)
      : [];
    canEdit = hasCapability(snapshot, "edit_tasks");
  } catch (error) {
    if (isNextInternalNavigationError(error)) throw error;
    if (isShoppingNotActivatedError(error)) {
      return <ShoppingNotActivated familyName={snapshot.family.name} />;
    }
    console.error("[boodschappen] laden mislukt:", error);
    return <ShoppingLoadError familyName={snapshot.family.name} />;
  }

  return (
    <div className="famli-page">
      <PageHeader
        title="Boodschappen"
        subtitle={`Gedeelde lijst voor ${snapshot.family.name}`}
      />
      <ShoppingListView
        snapshot={{ ...snapshot, shoppingLists: lists, shoppingItems: items }}
        lists={lists}
        items={items}
        activeListId={activeList?.id ?? ""}
        canEdit={canEdit}
      />
    </div>
  );
}
