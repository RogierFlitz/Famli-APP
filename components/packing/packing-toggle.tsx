"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createPackingItemAction, togglePackingItemAction } from "@/lib/actions/packing";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { PackingContext } from "@/lib/domain/types";

export function PackingToggle({
  itemId,
  checked,
  label,
  disabled = false,
  compact = false,
}: {
  itemId: string;
  checked: boolean;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      setOptimistic(next);
      try {
        await togglePackingItemAction(itemId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Afvinken mislukt");
      }
    });
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl px-1",
        compact ? "min-h-10 py-0.5" : "min-h-12 py-1",
      )}
    >
      <Checkbox
        checked={optimistic}
        disabled={disabled || pending}
        onCheckedChange={(value) => toggle(value === true)}
        aria-label={optimistic ? `${label} terugzetten` : `${label} afvinken`}
        className={cn("shrink-0 rounded-md", compact ? "size-5 rounded-md" : "size-11 rounded-xl")}
      />
      <span className={cn("leading-snug", compact ? "text-sm" : "text-base", optimistic && "text-[color:var(--famli-muted)] line-through")}>
        {label}
      </span>
    </label>
  );
}

export function PackingAddRow({
  childId,
  context,
  eventId,
  handoverId,
  dueOn,
  disabled = false,
}: {
  childId: string;
  context?: PackingContext;
  eventId?: string | null;
  handoverId?: string | null;
  dueOn?: string | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(formData: FormData) {
    const label = String(formData.get("label") ?? "").trim();
    if (!label) return;
    startTransition(async () => {
      try {
        await createPackingItemAction(formData);
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Toevoegen mislukt");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="mt-1 inline-flex min-h-11 w-full items-center gap-1.5 rounded-2xl px-1 text-left text-sm font-medium leading-none text-[color:var(--famli-brand)]"
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
        Item toevoegen
      </button>
    );
  }

  return (
    <form action={submit} className="mt-1">
      <input type="hidden" name="childId" value={childId} />
      {context ? <input type="hidden" name="context" value={context} /> : null}
      {eventId ? <input type="hidden" name="eventId" value={eventId} /> : null}
      {handoverId ? <input type="hidden" name="handoverId" value={handoverId} /> : null}
      {dueOn ? <input type="hidden" name="dueOn" value={dueOn} /> : null}
      <label className="sr-only" htmlFor={`pack-add-${childId}`}>
        Wat moet mee?
      </label>
      <input
        ref={inputRef}
        id={`pack-add-${childId}`}
        name="label"
        placeholder="Wat moet mee?"
        autoComplete="off"
        disabled={pending}
        className="famli-input min-h-12"
      />
    </form>
  );
}

export function PackingSuggestionToggle({
  childId,
  label,
  context,
  eventId,
  handoverId,
  dueOn,
  disabled = false,
  compact = false,
}: {
  childId: string;
  label: string;
  context: PackingContext;
  eventId: string | null;
  handoverId: string | null;
  dueOn: string | null;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState(false);

  function persistChecked() {
    const formData = new FormData();
    formData.set("childId", childId);
    formData.set("label", label);
    formData.set("context", context);
    if (eventId) formData.set("eventId", eventId);
    if (handoverId) formData.set("handoverId", handoverId);
    formData.set("dueOn", dueOn ?? "");
    formData.set("checked", "true");
    startTransition(async () => {
      setChecked(true);
      try {
        await createPackingItemAction(formData);
      } catch (error) {
        setChecked(false);
        toast.error(error instanceof Error ? error.message : "Opslaan mislukt");
      }
    });
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl px-1",
        compact ? "min-h-10 py-0.5" : "min-h-12 py-1",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled || pending}
        onCheckedChange={(value) => {
          if (value === true) persistChecked();
        }}
        aria-label={`${label} afvinken`}
        className={cn("shrink-0", compact ? "size-5 rounded-md" : "size-11 rounded-xl")}
      />
      <span className={cn("leading-snug", compact ? "text-sm" : "text-base", checked && "text-[color:var(--famli-muted)] line-through")}>
        {label}
      </span>
    </label>
  );
}
