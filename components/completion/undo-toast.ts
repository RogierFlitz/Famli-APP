import { toast } from "sonner";

export function showCompletionUndoToast(message: string, undo: () => Promise<void>) {
  toast.success(message, {
    duration: 5000,
    action: {
      label: "Ongedaan maken",
      onClick: () => {
        void undo().catch((error) => {
          toast.error(error instanceof Error ? error.message : "Terugzetten mislukt");
        });
      },
    },
  });
}
