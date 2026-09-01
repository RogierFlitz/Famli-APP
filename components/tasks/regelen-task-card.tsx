"use client";

import { formatDayLong } from "@/lib/dates";
import { formatCompletedAt } from "@/lib/completion/format";
import { parentName } from "@/lib/queries/family-view";
import { taskResponsibilityLine } from "@/lib/queries/responsibility";
import { reopenTaskAction } from "@/lib/actions/family";
import type { FamilySnapshot, TaskItem } from "@/lib/domain/types";
import { TaskToggle } from "@/components/tasks/task-toggle";
import { ReopenButton } from "@/components/completion/reopen-button";

export function RegelenTaskCard({
  snapshot,
  task,
  highlight,
}: {
  snapshot: FamilySnapshot;
  task: TaskItem;
  highlight?: boolean;
}) {
  const isDone = task.status === "done";

  return (
    <article id={task.id} className={`famli-action-card ${highlight ? "ring-2 ring-[color:var(--famli-brand)]" : ""}`}>
      <div className="flex items-start gap-3">
        <TaskToggle taskId={task.id} checked={isDone} title={task.title} />
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${isDone ? "line-through opacity-80" : ""}`}>{task.title}</p>
          <p className="text-sm text-[color:var(--famli-muted)]">
            {task.childId ? snapshot.children.find((child) => child.id === task.childId)?.firstName : "Gezin"}
            {task.dueAt ? ` · voor ${formatDayLong(task.dueAt)}` : ""}
          </p>
          <p className="mt-1 text-sm font-medium">{taskResponsibilityLine(snapshot, task)}</p>
          {task.description ? <p className="mt-1 text-sm">{task.description}</p> : null}
          {isDone ? (
            <p className="mt-1 text-sm text-[color:var(--famli-muted)]">✓ Afgerond · {formatCompletedAt(task.updatedAt)}</p>
          ) : null}
        </div>
        {isDone ? <ReopenButton compact onReopen={() => reopenTaskAction(task.id)} /> : null}
      </div>
    </article>
  );
}
