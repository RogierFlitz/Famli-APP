"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { shoppingCategoryLabel } from "@/lib/domain/labels";
import { formatCompletedAt } from "@/lib/completion/format";
import {
  addShoppingItemAction,
  clearCompletedShoppingItemsAction,
  createShoppingListAction,
  deleteShoppingItemAction,
  deleteShoppingListAction,
  renameShoppingListAction,
  updateShoppingItemAction,
} from "@/lib/actions/shopping";
import { SHOPPING_CATEGORIES } from "@/lib/shopping/categories";
import type { FamilySnapshot, ShoppingItem, ShoppingList } from "@/lib/domain/types";
import { ShoppingItemToggle } from "@/components/shopping/shopping-item-toggle";
import { cn } from "@/lib/utils";

export function ShoppingListView({
  snapshot,
  lists,
  items,
  activeListId,
  canEdit,
}: {
  snapshot: FamilySnapshot;
  lists: ShoppingList[];
  items: ShoppingItem[];
  activeListId: string;
  canEdit: boolean;
}) {
  const activeList = lists.find((list) => list.id === activeListId) ?? lists[0];
  const listItems = items.filter((item) => item.listId === activeList?.id);
  const openItems = listItems.filter((item) => !item.completed);
  const completedItems = listItems.filter((item) => item.completed);

  if (!activeList) {
    return (
      <div className="famli-card rounded-3xl p-6 text-center text-sm text-[color:var(--famli-muted)]">
        Geen boodschappenlijst gevonden.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ListTabs lists={lists} activeListId={activeList.id} canEdit={canEdit} />
      {canEdit ? <QuickAdd listId={activeList.id} /> : null}
      <section className="space-y-2">
        {openItems.length ? (
          openItems.map((item) => (
            <ShoppingItemCard
              key={item.id}
              snapshot={snapshot}
              item={item}
              canEdit={canEdit}
            />
          ))
        ) : (
          <p className="rounded-2xl px-1 py-6 text-sm text-[color:var(--famli-muted)]">
            {canEdit ? "Voeg iets toe — typ en druk op Enter." : "De lijst is leeg."}
          </p>
        )}
      </section>
      {completedItems.length ? (
        <CompletedSection
          snapshot={snapshot}
          items={completedItems}
          listId={activeList.id}
          canEdit={canEdit}
        />
      ) : null}
      {canEdit ? <ListManagement lists={lists} activeList={activeList} /> : null}
    </div>
  );
}

function ListTabs({
  lists,
  activeListId,
  canEdit,
}: {
  lists: ShoppingList[];
  activeListId: string;
  canEdit: boolean;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {lists.map((list) => {
        const active = list.id === activeListId;
        return (
          <a
            key={list.id}
            href={`/boodschappen?list=${list.id}`}
            className={cn(
              "shrink-0 min-h-11 rounded-full px-4 py-2 text-sm font-medium transition",
              active
                ? "bg-[color:var(--famli-ink)] text-white"
                : "bg-[color:var(--famli-bg)] text-[color:var(--famli-muted)] hover:text-[color:var(--famli-ink)]",
            )}
          >
            {list.name}
          </a>
        );
      })}
      {canEdit ? <NewListButton /> : null}
    </div>
  );
}

function QuickAdd({ listId }: { listId: string }) {
  const [name, setName] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        formData.set("listId", listId);
        await addShoppingItemAction(formData);
        setName("");
        setShowDetails(false);
        toast.success("Toegevoegd");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Actie mislukt");
      }
    });
  }

  return (
    <form
      className="sticky top-0 z-10 space-y-3 rounded-2xl bg-[color:var(--famli-bg)]/90 py-2 backdrop-blur-sm"
      action={submit}
    >
      <div className="flex gap-2">
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Bijv. Melk"
          className="famli-input min-h-12 flex-1 text-base"
          required
          disabled={pending}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !showDetails) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="famli-btn famli-btn-primary min-h-12 px-5"
        >
          Toevoegen
        </button>
      </div>
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-[color:var(--famli-muted)]"
        onClick={() => setShowDetails((value) => !value)}
      >
        <ChevronDown className={cn("size-4 transition", showDetails && "rotate-180")} />
        {showDetails ? "Minder details" : "Meer details"}
      </button>
      {showDetails ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="quantity" placeholder="Aantal" inputMode="decimal" className="famli-input" />
          <input name="unit" placeholder="Eenheid (pak, kg)" className="famli-input" />
          <select name="category" className="famli-input sm:col-span-2" defaultValue="">
            <option value="">Categorie automatisch</option>
            {SHOPPING_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {shoppingCategoryLabel[category]}
              </option>
            ))}
          </select>
          <input name="note" placeholder="Notitie" className="famli-input sm:col-span-2" />
        </div>
      ) : null}
    </form>
  );
}

function ShoppingItemCard({
  snapshot,
  item,
  canEdit,
}: {
  snapshot: FamilySnapshot;
  item: ShoppingItem;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const detail = [item.quantity, item.unit].filter(Boolean).join(" ");
  const addedBy = snapshot.profiles[item.createdBy]?.firstName ?? "Gezinslid";

  if (editing && canEdit) {
    return (
      <form
        className="famli-card space-y-2 p-4"
        action={(formData) => {
          startTransition(async () => {
            try {
              formData.set("id", item.id);
              await updateShoppingItemAction(formData);
              setEditing(false);
              toast.success("Opgeslagen");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Actie mislukt");
            }
          });
        }}
      >
        <input name="name" defaultValue={item.name} required className="famli-input" />
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="quantity" defaultValue={item.quantity ?? ""} placeholder="Aantal" className="famli-input" />
          <input name="unit" defaultValue={item.unit ?? ""} placeholder="Eenheid" className="famli-input" />
        </div>
        <select name="category" defaultValue={item.category} className="famli-input">
          {SHOPPING_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {shoppingCategoryLabel[category]}
            </option>
          ))}
        </select>
        <input name="note" defaultValue={item.note ?? ""} placeholder="Notitie" className="famli-input" />
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="famli-btn famli-btn-primary">
            Opslaan
          </button>
          <button type="button" className="famli-btn" onClick={() => setEditing(false)}>
            Annuleren
          </button>
        </div>
      </form>
    );
  }

  return (
    <article
      className={cn(
        "flex min-h-11 items-start gap-3 border-b border-[color:var(--famli-border)] py-3 last:border-b-0",
        item.completed && "opacity-60",
      )}
    >
      <ShoppingItemToggle
        itemId={item.id}
        checked={item.completed}
        title={item.name}
        disabled={!canEdit}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium", item.completed && "line-through")}>{item.name}</p>
        <p className="text-sm text-[color:var(--famli-muted)]">
          {[detail, shoppingCategoryLabel[item.category], item.note].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 text-xs text-[color:var(--famli-muted)]">
          Toegevoegd door {addedBy}
          {item.completed && item.completedAt
            ? ` · Afgevinkt ${formatCompletedAt(item.completedAt)}`
            : null}
        </p>
      </div>
      {canEdit ? (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label="Bewerken"
            className="grid size-11 place-items-center rounded-xl text-[color:var(--famli-muted)] hover:bg-[color:var(--famli-surface)]"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Verwijderen"
            className="grid size-11 place-items-center rounded-xl text-[color:var(--famli-muted)] hover:bg-[color:var(--famli-surface)]"
            onClick={() =>
              startTransition(async () => {
                try {
                  await deleteShoppingItemAction(item.id);
                  toast.success("Verwijderd");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Actie mislukt");
                }
              })
            }
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : null}
    </article>
  );
}

function CompletedSection({
  snapshot,
  items,
  listId,
  canEdit,
}: {
  snapshot: FamilySnapshot;
  items: ShoppingItem[];
  listId: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium text-[color:var(--famli-muted)]"
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
          Afgevinkt ({items.length})
        </button>
        {canEdit ? (
          <button
            type="button"
            disabled={pending}
            className="text-sm text-[color:var(--famli-brand)] underline-offset-2 hover:underline"
            onClick={() => {
              if (!window.confirm("Afgevinkte items opruimen? Dit kan niet ongedaan worden gemaakt.")) {
                return;
              }
              startTransition(async () => {
                try {
                  await clearCompletedShoppingItemsAction(listId);
                  toast.success("Afgevinkte items opgeruimd");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Actie mislukt");
                }
              });
            }}
          >
            Afgevinkte items opruimen
          </button>
        ) : null}
      </div>
      {open
        ? items.map((item) => (
            <ShoppingItemCard key={item.id} snapshot={snapshot} item={item} canEdit={canEdit} />
          ))
        : null}
    </section>
  );
}

function NewListButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full border border-dashed border-[color:var(--famli-border)] px-4 py-2 text-sm text-[color:var(--famli-muted)]"
      >
        + Lijst
      </button>
    );
  }

  return (
    <form
      className="flex shrink-0 items-center gap-2"
      action={(formData) => {
        startTransition(async () => {
          try {
            await createShoppingListAction(formData);
            setOpen(false);
            toast.success("Lijst aangemaakt");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Actie mislukt");
          }
        });
      }}
    >
      <input name="name" placeholder="Naam" className="famli-input h-10 w-36" required autoFocus />
      <button type="submit" disabled={pending} className="famli-btn famli-btn-primary h-10 px-3 text-sm">
        Opslaan
      </button>
    </form>
  );
}

function ListManagement({ lists, activeList }: { lists: ShoppingList[]; activeList: ShoppingList }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="pt-2">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-[color:var(--famli-muted)]"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="size-4" />
        Lijst beheren
      </button>
      {open ? (
        <div className="famli-card mt-2 space-y-3 p-4">
          {renaming ? (
            <form
              action={(formData) => {
                startTransition(async () => {
                  try {
                    formData.set("listId", activeList.id);
                    await renameShoppingListAction(formData);
                    setRenaming(false);
                    toast.success("Lijst hernoemd");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Actie mislukt");
                  }
                });
              }}
              className="flex gap-2"
            >
              <input name="name" defaultValue={activeList.name} className="famli-input flex-1" required />
              <button type="submit" disabled={pending} className="famli-btn famli-btn-primary">
                Opslaan
              </button>
            </form>
          ) : (
            <button type="button" className="famli-btn w-full" onClick={() => setRenaming(true)}>
              Lijst hernoemen
            </button>
          )}
          <form
            action={(formData) => {
              const message = activeList.isDefault
                ? `"${activeList.name}" is de standaardlijst. Weet je zeker dat je deze wilt verwijderen?`
                : `Lijst "${activeList.name}" verwijderen?`;
              if (!window.confirm(message)) return;
              startTransition(async () => {
                try {
                  formData.set("listId", activeList.id);
                  await deleteShoppingListAction(formData);
                  toast.success("Lijst verwijderd");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Actie mislukt");
                }
              });
            }}
          >
            <input type="hidden" name="listId" value={activeList.id} />
            <button type="submit" disabled={pending || lists.length <= 1} className="famli-btn w-full text-red-600">
              Lijst verwijderen
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
