"use client";

import { completeRoutineOccurrenceAction, reopenRoutineOccurrenceAction } from "@/lib/actions/routines";
import { reopenTaskAction } from "@/lib/actions/family";
import type { DutyItem } from "@/lib/queries/routines";
import { TaskToggle } from "@/components/tasks/task-toggle";
import { Checkbox } from "@/components/ui/checkbox";
import { showCompletionUndoToast } from "@/components/completion/undo-toast";
import { ReopenButton } from "@/components/completion/reopen-button";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

export function OpenDutyCard({ item }: { item: DutyItem }) {
  const [pending, startTransition] = useTransition();
  const isTask = item.kind === "task" && item.task;
  const isOccurrence = item.occurrence?.status === "pending";

  function completeOccurrence() {
    if (!item.occurrence) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("occurrenceId", item.occurrence!.id);
        await completeRoutineOccurrenceAction(formData);
        showCompletionUndoToast("Afgerond", () => reopenRoutineOccurrenceAction(item.occurrence!.id));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Actie mislukt");
      }
    });
  }

  return (
    <div className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4">
      <div className="flex items-start gap-3">
        {isTask ? (
          <TaskToggle taskId={item.task!.id} checked={false} title={item.title} />
        ) : isOccurrence ? (
          <Checkbox
            checked={false}
            disabled={pending}
            onCheckedChange={(value) => {
              if (value === true) completeOccurrence();
            }}
            aria-label={`${item.title} afgerond`}
            className="mt-1 size-5 shrink-0 rounded-md"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[color:var(--famli-muted)]">{item.time}</p>
          <p className="text-lg font-medium">{item.title}</p>
          {item.subtitle ? <p className="text-sm text-[color:var(--famli-muted)]">{item.subtitle}</p> : null}
          {item.packingItems.length ? (
            <p className="mt-2 text-sm text-[color:var(--famli-muted)]">🎒 {item.packingItems.join(", ")}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={item.href} className="famli-btn famli-btn-secondary h-10 px-4 text-sm">
              Bekijk
            </Link>
            {isTask ? (
              <Link href={`/regelen?tab=samen`} className="famli-btn famli-btn-secondary h-10 px-4 text-sm">
                Iemand anders vragen
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompletedDutyCard({ item }: { item: DutyItem }) {
  async function reopen() {
    if (item.task) {
      await reopenTaskAction(item.task.id);
      return;
    }
    if (item.occurrence) {
      await reopenRoutineOccurrenceAction(item.occurrence.id);
    }
  }

  return (
    <div className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-5 py-4 opacity-80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[color:var(--famli-muted)]">{item.time}</p>
          <p className="text-lg font-medium line-through">{item.title}</p>
          <p className="mt-1 text-sm text-[color:var(--famli-muted)]">✓ Afgerond</p>
        </div>
        <ReopenButton compact onReopen={reopen} />
      </div>
    </div>
  );
}
