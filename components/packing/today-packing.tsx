"use client";

import { PackingAddRow, PackingSuggestionToggle, PackingToggle } from "@/components/packing/packing-toggle";
import type { PackingGroup } from "@/lib/queries/packing";

export function TodayPacking({
  groups,
  canEdit,
}: {
  groups: PackingGroup[];
  canEdit: boolean;
}) {
  if (!groups.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="famli-section-title">Niet vergeten</h2>
      <div className="space-y-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded-3xl border border-[color:var(--famli-border)] bg-[color:var(--famli-card)] px-4 py-3"
          >
            <p className="font-medium">
              {group.childName} · {group.title} {group.when}
            </p>
            <p className="text-sm text-[color:var(--famli-muted)]">{group.progressLabel}</p>
            <ul className="mt-1">
              {group.items.map((item) => (
                <li key={item.id}>
                  <PackingToggle itemId={item.id} checked={item.checked} label={item.label} disabled={!canEdit} />
                </li>
              ))}
              {group.suggestions.map((item) => (
                <li key={item.key}>
                  <PackingSuggestionToggle
                    childId={item.childId}
                    label={item.label}
                    context={item.context}
                    eventId={item.eventId}
                    handoverId={item.handoverId}
                    dueOn={item.dueOn}
                    disabled={!canEdit}
                  />
                </li>
              ))}
            </ul>
            {canEdit ? (
              <PackingAddRow
                childId={group.childId}
                context={group.suggestions[0]?.context ?? group.items[0]?.context ?? "other"}
                eventId={group.items[0]?.eventId ?? group.suggestions[0]?.eventId}
                handoverId={group.items[0]?.handoverId ?? group.suggestions[0]?.handoverId}
                dueOn={group.items[0]?.dueOn ?? group.suggestions[0]?.dueOn}
              />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
