"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { purchaseNeededAction, unmarkNeededItemBoughtAction } from "@/lib/actions/life";
import { neededStatusLabel } from "@/lib/domain/labels";
import { showCompletionUndoToast } from "@/components/completion/undo-toast";
import { toast } from "sonner";

export function NeededToggle({
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
          const formData = new FormData();
          formData.set("id", itemId);
          await purchaseNeededAction(formData);
          showCompletionUndoToast(neededStatusLabel.gekocht, () => unmarkNeededItemBoughtAction(itemId));
        } else {
          await unmarkNeededItemBoughtAction(itemId);
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
      aria-label={checked ? `${title} niet meer gekocht` : `${title} gekocht`}
      className="mt-1 size-5 shrink-0 rounded-md"
    />
  );
}
