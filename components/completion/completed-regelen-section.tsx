"use client";

import { formatCompletedAt } from "@/lib/completion/format";
import { parentName } from "@/lib/queries/family-view";
import { reopenTaskAction } from "@/lib/actions/family";
import { unmarkNeededItemBoughtAction } from "@/lib/actions/life";
import type { FamilySnapshot, NeededItem, TaskItem } from "@/lib/domain/types";
import { CollapsibleSection, ExpandableList } from "@/components/ui/collapsible-section";
import { ReopenButton } from "@/components/completion/reopen-button";

type CompletedEntry =
  | {
      kind: "task";
      id: string;
      title: string;
      completedAt: string;
      completedByMemberId: string | null;
      canUndo: true;
    }
  | {
      kind: "needed";
      id: string;
      title: string;
      completedAt: string;
      completedByMemberId: string | null;
      canUndo: boolean;
      childName?: string;
    };

function buildEntries(tasks: TaskItem[], neededItems: NeededItem[], snapshot: FamilySnapshot): CompletedEntry[] {
  const entries: CompletedEntry[] = [
    ...tasks.map((task) => ({
      kind: "task" as const,
      id: task.id,
      title: task.title,
      completedAt: task.updatedAt,
      completedByMemberId: task.assigneeMemberId,
      canUndo: true as const,
    })),
    ...neededItems.map((item) => ({
      kind: "needed" as const,
      id: item.id,
      title: item.title,
      completedAt: item.purchasedAt ?? item.createdAt,
      completedByMemberId: item.purchasedByMemberId,
      canUndo: !item.expenseId,
      childName: snapshot.children.find((child) => child.id === item.childId)?.firstName,
    })),
  ];

  return entries.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

function CompletedEntryCard({
  snapshot,
  entry,
}: {
  snapshot: FamilySnapshot;
  entry: CompletedEntry;
}) {
  const completedBy = entry.completedByMemberId
    ? parentName(snapshot, entry.completedByMemberId)
    : null;

  return (
    <article className="famli-card opacity-80" id={entry.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--famli-muted)]">
            {entry.kind === "task" ? "Taak" : "Nodig"}
          </p>
          <p className="mt-1 text-lg font-medium line-through">{entry.title}</p>
          <p className="text-sm text-[color:var(--famli-muted)]">
            ✓ Afgerond · {formatCompletedAt(entry.completedAt)}
            {entry.kind === "needed" && entry.childName ? ` · ${entry.childName}` : ""}
            {completedBy ? ` · door ${completedBy}` : ""}
          </p>
        </div>
        {entry.canUndo ? (
          <ReopenButton
            compact
            onReopen={() =>
              entry.kind === "task" ? reopenTaskAction(entry.id) : unmarkNeededItemBoughtAction(entry.id)
            }
          />
        ) : null}
      </div>
    </article>
  );
}

export function CompletedRegelenSection({
  snapshot,
  tasks,
  neededItems,
}: {
  snapshot: FamilySnapshot;
  tasks: TaskItem[];
  neededItems: NeededItem[];
}) {
  const entries = buildEntries(tasks, neededItems, snapshot);
  if (!entries.length) return null;

  return (
    <CollapsibleSection title="Afgerond" count={entries.length}>
      <ExpandableList
        items={entries}
        initialLimit={20}
        renderItem={(entry) => <CompletedEntryCard key={entry.id} snapshot={snapshot} entry={entry} />}
      />
    </CollapsibleSection>
  );
}
