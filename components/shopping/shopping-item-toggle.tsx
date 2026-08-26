"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleShoppingItemAction } from "@/lib/actions/shopping";
import { showCompletionUndoToast } from "@/components/completion/undo-toast";
import { toast } from "sonner";

export function ShoppingItemToggle({
  itemId,
  checked,
  title,
  disabled = false,
}: {
  itemId: string;
  checked: boolean;
  title: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle(nextChecked: boolean) {
    startTransition(async () => {
      try {
        if (nextChecked) {
          await toggleShoppingItemAction(itemId);
          showCompletionUndoToast("Afgevinkt", () => toggleShoppingItemAction(itemId));
        } else {
          await toggleShoppingItemAction(itemId);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Actie mislukt");
      }
    });
  }

  return (
    <Checkbox
      checked={checked}
      disabled={disabled || pending}
      onCheckedChange={(value) => toggle(value === true)}
      aria-label={checked ? `${title} terugzetten` : `${title} afvinken`}
      className="size-6 shrink-0 rounded-md"
    />
  );
}
