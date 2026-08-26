"use client";

import { formatCompletedAt } from "@/lib/completion/format";
import { parentName } from "@/lib/queries/family-view";
import { reopenTaskAction } from "@/lib/actions/family";
import type { FamilySnapshot, TaskItem } from "@/lib/domain/types";
import { CollapsibleSection, ExpandableList } from "@/components/ui/collapsible-section";
import { ReopenButton } from "@/components/completion/reopen-button";

export function CompletedTasksSection({
  snapshot,
  tasks,
}: {
  snapshot: FamilySnapshot;
  tasks: TaskItem[];
}) {
  if (!tasks.length) return null;

  return (
    <CollapsibleSection title="Afgerond" count={tasks.length}>
      <ExpandableList
        items={tasks}
        initialLimit={20}
        renderItem={(task) => (
          <article key={task.id} id={task.id} className="famli-card opacity-80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-medium line-through">{task.title}</p>
                <p className="text-sm text-[color:var(--famli-muted)]">
                  ✓ Afgerond · {formatCompletedAt(task.updatedAt)}
                  {task.childId ? ` · ${snapshot.children.find((child) => child.id === task.childId)?.firstName}` : ""}
                  {task.assigneeMemberId ? ` · door ${parentName(snapshot, task.assigneeMemberId)}` : ""}
                </p>
              </div>
              <ReopenButton compact onReopen={() => reopenTaskAction(task.id)} />
            </div>
          </article>
        )}
      />
    </CollapsibleSection>
  );
}
