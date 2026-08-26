"use client";

import { formatDayLong } from "@/lib/dates";
import { parentName } from "@/lib/queries/family-view";
import type { FamilySnapshot, TaskItem } from "@/lib/domain/types";
import { CollapsibleSection, ExpandableList } from "@/components/ui/collapsible-section";

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
            <p className="text-lg font-medium line-through">{task.title}</p>
            <p className="text-sm text-[color:var(--famli-muted)]">
              ✓ Afgerond
              {task.childId ? ` · ${snapshot.children.find((child) => child.id === task.childId)?.firstName}` : ""}
              {task.assigneeMemberId ? ` · ${parentName(snapshot, task.assigneeMemberId)}` : ""}
              {task.dueAt ? ` · voor ${formatDayLong(task.dueAt)}` : ""}
              {task.updatedAt ? ` · ${formatDayLong(task.updatedAt)}` : ""}
            </p>
          </article>
        )}
      />
    </CollapsibleSection>
  );
}
