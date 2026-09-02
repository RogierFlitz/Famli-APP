"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { addShoppingItemAction } from "@/lib/actions/shopping";
import { ShoppingItemToggle } from "@/components/shopping/shopping-item-toggle";
import type { FamilySnapshot, ShoppingItem, ShoppingList } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function TodayShoppingCard({
  snapshot,
  list,
  items,
  canEdit,
}: {
  snapshot: FamilySnapshot;
  list: ShoppingList | null;
  items: ShoppingItem[];
  canEdit: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  if (!list) return null;

  const open = items.filter((item) => !item.completed).slice(0, 6);
  const done = items.filter((item) => item.completed).slice(0, 2);
  const rows = [...open, ...done];

  function add(formData: FormData) {
    startTransition(async () => {
      try {
        await addShoppingItemAction(formData);
        if (inputRef.current) inputRef.current.value = "";
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Toevoegen mislukt");
      }
    });
  }

  return (
    <section className="famli-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="famli-section-title">Boodschappen</h2>
        <Link href="/boodschappen" className="text-sm font-medium text-[color:var(--famli-brand)]">
          Alles →
        </Link>
      </div>
      {rows.length ? (
        <ul>
          {rows.map((item) => {
            const who = snapshot.profiles[item.createdBy]?.firstName ?? null;
            return (
              <li key={item.id} className="flex min-h-10 items-center gap-3">
                <ShoppingItemToggle itemId={item.id} checked={item.completed} title={item.name} disabled={!canEdit} />
                <span className={cn("min-w-0 flex-1 text-sm", item.completed && "text-[color:var(--famli-muted)] line-through")}>
                  {item.name}
                </span>
                {who ? <span className="shrink-0 text-xs text-[color:var(--famli-muted)]">{who}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-[color:var(--famli-muted)]">Nog niets op de lijst</p>
      )}
      {canEdit ? (
        <form action={add} className="mt-2">
          <input type="hidden" name="listId" value={list.id} />
          <label className="sr-only" htmlFor="today-shop-add">
            Item toevoegen
          </label>
          <div className="flex items-center gap-2">
            <Plus className="size-3.5 shrink-0 text-[color:var(--famli-brand)]" strokeWidth={2.5} />
            <input
              ref={inputRef}
              id="today-shop-add"
              name="name"
              disabled={pending}
              placeholder="Item toevoegen"
              autoComplete="off"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm font-medium text-[color:var(--famli-brand)] outline-none placeholder:text-[color:var(--famli-brand)]/70"
            />
          </div>
        </form>
      ) : null}
    </section>
  );
}
