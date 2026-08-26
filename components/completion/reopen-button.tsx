"use client";

import { useTransition } from "react";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";

export function ReopenButton({
  label = "Terugzetten",
  onReopen,
  compact = false,
}: {
  label?: string;
  onReopen: () => Promise<void>;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await onReopen();
            toast.message("Teruggezet");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Terugzetten mislukt");
          }
        })
      }
      className={
        compact
          ? "inline-flex size-9 items-center justify-center rounded-full border border-[color:var(--famli-border)] text-[color:var(--famli-muted)] hover:text-[color:var(--famli-ink)] disabled:opacity-50"
          : "famli-btn famli-btn-secondary h-9 px-3 text-sm disabled:opacity-50"
      }
      aria-label={label}
      title={label}
    >
      {compact ? <Undo2 className="size-4" /> : label}
    </button>
  );
}
