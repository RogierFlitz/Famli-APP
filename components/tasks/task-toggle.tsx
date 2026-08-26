"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { reopenTaskAction, updateTaskStatusAction } from "@/lib/actions/family";
import { showCompletionUndoToast } from "@/components/completion/undo-toast";
import { toast } from "sonner";

export function TaskToggle({
  taskId,
  checked,
  title,
  disabled = false,
}: {
  taskId: string;
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
          formData.set("taskId", taskId);
          formData.set("status", "done");
          await updateTaskStatusAction(formData);
          showCompletionUndoToast("Afgerond", () => reopenTaskAction(taskId));
        } else {
          await reopenTaskAction(taskId);
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
      aria-label={checked ? `${title} terugzetten` : `${title} afgerond`}
      className="mt-1 size-5 shrink-0 rounded-md"
    />
  );
}
